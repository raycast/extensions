// The client (src/lib/client.ts) against a stand-in daemon: when it waits, when it replaces a daemon, and that it never
// signals a process it didn't start. Each case runs the real client in a process of its own (it reads Raycast's
// environment when it loads), with a stand-in for @raycast/api, as test/e2e.test.ts does.

import assert from "node:assert/strict";
import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, describe, it } from "node:test";
import { API_VERSION, DAEMON_INFO_FILE, type DaemonInfo } from "../engine/api";

const repo = resolve(import.meta.dirname, "..");
const pids = new Set<number>();
const temps: string[] = [];
after(() => {
  for (const pid of pids) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // gone
    }
  }
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

const alive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

/** A daemon that answers /status (after FAKE_STATUS_DELAY_MS) with FAKE_API, and leaves on /quit. */
const FAKE_DAEMON = `
const http = require("node:http"), fs = require("node:fs"), path = require("node:path");
const support = process.argv[process.argv.indexOf("--support") + 1];
const socket = path.join(support, "d.sock");
try { fs.unlinkSync(socket); } catch {}
const delay = Number(process.env.FAKE_STATUS_DELAY_MS || 0), api = Number(process.env.FAKE_API || ${API_VERSION});
http.createServer((request, response) => {
  if (request.url === "/quit") { response.end("{}"); setTimeout(() => process.exit(0), 50); return; }
  setTimeout(() => response.end(JSON.stringify({ apiVersion: api, pid: process.pid })), delay);
}).listen(socket, () => {
  fs.writeFileSync(path.join(support, "daemon.json"),
    JSON.stringify({ pid: process.pid, socket, apiVersion: api, startedAt: Math.round(performance.timeOrigin) }));
});
`;

interface World {
  support: string;
  assets: string;
  work: string;
}

function world(): World {
  const work = realpathSync(mkdtempSync(join(tmpdir(), "dig-up-client-")));
  temps.push(work);
  const support = join(work, "s");
  const assets = join(work, "a");
  mkdirSync(support);
  mkdirSync(assets);
  writeFileSync(join(assets, "daemon.js"), FAKE_DAEMON); // before any daemon starts: it isn't "rebuilt since"
  writeFileSync(
    join(work, "raycast-api.cjs"),
    "exports.environment = { supportPath: process.env.DIGUP_SUPPORT, assetsPath: process.env.DIGUP_ASSETS };\n" +
      "exports.getPreferenceValues = () => ({});\nexports.Toast = { Style: {} };\nexports.showToast = async () => {};\n",
  );
  writeFileSync(
    join(work, "preload.cjs"),
    `const Module = require("node:module");\nconst resolve = Module._resolveFilename;\n` +
      `Module._resolveFilename = function (request, ...rest) {\n` +
      `  return request === "@raycast/api" ? ${JSON.stringify(join(work, "raycast-api.cjs"))} : resolve.call(this, request, ...rest);\n};\n`,
  );
  writeFileSync(
    join(work, "driver.ts"),
    `import { api, parseHours } from ${JSON.stringify(join(repo, "src/lib/client"))};\n` +
      `void (async () => {\n` +
      `  if (process.argv[2] === "hours") {\n` +
      `    console.log(JSON.stringify(JSON.parse(process.argv[3]).map((text: string) => parseHours(text))));\n` +
      `    process.exit(0);\n` +
      `  }\n` +
      `  const started = performance.now();\n` +
      `  try {\n` +
      `    const s = await api("GET /status");\n` +
      `    console.log(JSON.stringify({ ok: true, pid: s.pid, ms: performance.now() - started }));\n` +
      `  } catch (error) {\n` +
      `    console.log(JSON.stringify({ ok: false, error: String(error) }));\n` +
      `  }\n` +
      `  process.exit(0);\n` +
      `})();\n`,
  );
  return { support, assets, work };
}

/** The client in a process of its own, as a Raycast command. */
function client(w: World, ...args: string[]): { ok: boolean; pid?: number; ms?: number; error?: string } {
  const run = spawnSync(
    process.execPath,
    [
      "--no-warnings=ExperimentalWarning",
      "--require",
      join(w.work, "preload.cjs"),
      "--import",
      "tsx",
      join(w.work, "driver.ts"),
      ...args,
    ],
    {
      cwd: repo,
      env: { ...process.env, DIGUP_SUPPORT: w.support, DIGUP_ASSETS: w.assets, FAKE_STATUS_DELAY_MS: "", FAKE_API: "" },
      encoding: "utf8",
      timeout: 60_000,
    },
  );
  const line = run.stdout.split("\n").find((l) => l.startsWith("{") || l.startsWith("["));
  if (!line) throw new Error(`the client printed nothing: ${run.stderr}`);
  const answer = JSON.parse(line);
  if (typeof answer?.pid === "number") pids.add(answer.pid);
  return answer;
}

const readInfo = (w: World): DaemonInfo | null =>
  existsSync(join(w.support, DAEMON_INFO_FILE))
    ? JSON.parse(readFileSync(join(w.support, DAEMON_INFO_FILE), "utf8"))
    : null;

/** A daemon started as a client would start it, with the stand-in's settings. */
async function daemon(w: World, env: Record<string, string> = {}): Promise<ChildProcess> {
  const child = spawn(process.execPath, [join(w.assets, "daemon.js"), "--support", w.support, "--assets", w.assets], {
    env: { ...process.env, ...env },
    stdio: "ignore",
  });
  pids.add(child.pid!);
  for (let i = 0; i < 100 && readInfo(w)?.pid !== child.pid; i++) await sleep(50);
  assert.equal(readInfo(w)?.pid, child.pid, "the stand-in daemon started");
  return child;
}

describe("the client and the daemon it finds", () => {
  it("waits for a daemon that is slow to answer; it doesn't replace it", { timeout: 60_000 }, async () => {
    const w = world();
    // Busy for 3 s at each /status: a big sync, or a reset of half a million vectors.
    const busy = await daemon(w, { FAKE_STATUS_DELAY_MS: "3000" });
    const answer = client(w);
    assert.ok(answer.ok, answer.error);
    assert.equal(answer.pid, busy.pid, "the same daemon answered");
    assert.ok(alive(busy.pid!), "and it's still running");
  });

  it("never signals the process a stale daemon.json names; it starts a daemon", { timeout: 60_000 }, async () => {
    const w = world();
    // A daemon killed with -9 left daemon.json behind; its pid now belongs to something else.
    const other = spawn("/bin/sleep", ["600"], { stdio: "ignore" });
    pids.add(other.pid!);
    const stale: DaemonInfo = {
      pid: other.pid!,
      socket: join(w.support, "gone.sock"),
      apiVersion: API_VERSION,
      startedAt: 0,
    };
    writeFileSync(join(w.support, DAEMON_INFO_FILE), JSON.stringify(stale));
    const answer = client(w);
    assert.ok(answer.ok, answer.error);
    assert.notEqual(answer.pid, other.pid);
    await sleep(200);
    assert.ok(alive(other.pid!), "the other program was left alone");
    assert.equal(readInfo(w)?.pid, answer.pid);
  });

  it("replaces a daemon that says it's an older build", { timeout: 60_000 }, async () => {
    const w = world();
    const old = await daemon(w, { FAKE_API: String(API_VERSION + 100) });
    const answer = client(w);
    assert.ok(answer.ok, answer.error);
    assert.notEqual(answer.pid, old.pid);
    for (let i = 0; i < 40 && alive(old.pid!); i++) await sleep(50);
    assert.ok(!alive(old.pid!), "the old one quit when asked");
  });

  it("reads Index Hours written in the usual ways, and nothing it can't read", () => {
    const w = world();
    const texts = [
      "22-7",
      "22 - 7",
      "22:00-07:00",
      "10pm-7am",
      "10 PM – 7 AM",
      "22 to 7",
      "0-24",
      "12am-6am",
      "",
      "22:30-7",
      "10.30-7",
      "25-7",
      "7-7",
    ];
    assert.deepEqual(client(w, "hours", JSON.stringify(texts)), [
      { start: 22, end: 7 },
      { start: 22, end: 7 },
      { start: 22, end: 7 },
      { start: 22, end: 7 },
      { start: 22, end: 7 },
      { start: 22, end: 7 },
      null, // all day is no limit
      { start: 0, end: 6 },
      null,
      null, // whole hours only
      null,
      null,
      null,
    ]);
  });
});
