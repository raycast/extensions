// The daemon end to end, as Raycast runs it (opt-in: DIGUP_E2E=1; it needs the testbed, the vendored llama.cpp, the model
// and a built assets/daemon.js, and runs for a few minutes). It starts `<this Node> assets/daemon.js` detached with its
// output in a log file, as src/lib/client.ts does, indexes DigUp's testbed through POST /config, and then calls every
// route in engine/api.ts. It also kills the daemon and lets the real client.ts start it again, checks that a daemon
// leaves when its parent goes, and that /quit cleans up. The numbers it measures are printed as test diagnostics, and
// written as JSON to $DIGUP_E2E_REPORT when that is set; $DIGUP_E2E_THUMBS gets a copy of each preview.
//
// Nothing here opens an app: there is no dry run for /open-pdf and /open-media, so they are called only in ways that
// fail before the helper reaches the Finder.

import assert from "node:assert/strict";
import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  closeSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { request } from "node:http";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";
import { API_VERSION, DAEMON_INFO_FILE, type DaemonInfo, type Routes, type Status } from "../engine/api";

const repo = resolve(import.meta.dirname, "..");
const assets = join(repo, "assets");
const daemonJs = join(assets, "daemon.js");
const testbed = join(repo, ".testbed");
const llamaServer = join(repo, ".vendor/llama-b11624/llama-server");
const models = join(homedir(), "Library/Application Support/DigUp/Models");
const PORTS = "18900-18999";

const needs: Array<[string, string]> = [
  [testbed, "DigUp's eval testbed"],
  [llamaServer, "the vendored llama.cpp"],
  [join(models, "mmproj-embeddinggemma-2-Q8_0.gguf"), "the model"],
  [join(assets, "digup-helper"), "the Swift helper"],
  [daemonJs, "assets/daemon.js (npm run build:engine)"],
];
const missing = needs.find(([path]) => !existsSync(path));
const skip =
  process.env.DIGUP_E2E !== "1"
    ? "the end-to-end run needs DIGUP_E2E=1"
    : missing
      ? `${missing[1]} is missing (${missing[0]})`
      : false;

/** DigUp 0.6.1 on this Mac (docs/baseline/index-*.log): the CLI's whole run for each index. */
const DIGUP_SECONDS = { main: 51.3, code: 8.3 };
/** docs/baseline/status.txt (DigUp) = docs/baseline/ours-status.txt. */
const MAIN_COUNTS = {
  screenshot: { files: 10, done: 10 },
  image: { files: 49, done: 46, skipped: 3 },
  pdf: { files: 5, done: 5 },
  doc: { files: 12, done: 12 },
  audio: { files: 10, done: 6, skipped: 4 },
  video: { files: 2, done: 2 },
};

const sleep = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

// ---------------------------------------------------------------------------------------------------------------------
// Processes

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

function ps(pid: number, field: string): string {
  return spawnSync("/bin/ps", ["-p", String(pid), "-o", `${field}=`], { encoding: "utf8" }).stdout.trim();
}

/** Child processes of `pid` whose command contains `name`. */
function children(pid: number, name: string): number[] {
  const out = spawnSync("/usr/bin/pgrep", ["-P", String(pid), "-f", name], { encoding: "utf8" }).stdout;
  return out.split("\n").filter(Boolean).map(Number);
}

/** Resident memory and macOS's footprint (what Activity Monitor shows), in MB. */
function memory(pid: number): { rssMB: number; footprintMB: number | null } | null {
  const rss = Number(ps(pid, "rss"));
  if (!rss) return null;
  const text = spawnSync("/usr/bin/footprint", [String(pid)], { encoding: "utf8" }).stdout;
  const match = /Footprint: ([\d.]+) (KB|MB|GB)/.exec(text);
  const scale = { KB: 1 / 1024, MB: 1, GB: 1024 } as const;
  const footprintMB = match ? Math.round(Number(match[1]) * scale[match[2] as keyof typeof scale]) : null;
  return { rssMB: Math.round(rss / 1024), footprintMB };
}

/** The environment Raycast gives the daemon (src/lib/client.ts start()), without the test runner's own variables. */
function daemonEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  delete env.NODE_OPTIONS;
  return {
    ...env,
    NODE_NO_WARNINGS: "1",
    PATH: ["/opt/homebrew/bin", "/usr/local/bin", process.env.PATH ?? "/usr/bin:/bin:/usr/sbin:/sbin"].join(":"),
    DIGUP_PORT_RANGE: PORTS,
  };
}

/** As client.ts start(): detached, output to the log file (never a pipe), unref'd. */
function spawnDaemon(support: string): ChildProcess {
  mkdirSync(join(support, "logs"), { recursive: true });
  const log = openSync(join(support, "logs", "daemon.log"), "a");
  try {
    const child = spawn(process.execPath, [daemonJs, "--support", support, "--assets", assets], {
      detached: true,
      stdio: ["ignore", log, log],
      env: daemonEnv(),
    });
    child.unref();
    return child;
  } finally {
    closeSync(log);
  }
}

function exited(child: ChildProcess, timeoutMs: number): Promise<number | null | "timeout"> {
  if (child.exitCode !== null) return Promise.resolve(child.exitCode);
  return new Promise((done) => {
    const timer = setTimeout(() => done("timeout"), timeoutMs);
    child.once("exit", (code) => {
      clearTimeout(timer);
      done(code);
    });
  });
}

type Maybe<T> = T | null | undefined | false;

/** Resolves with the first truthy value `check` gives. */
async function waitFor<T>(
  what: string,
  check: () => Maybe<T> | Promise<Maybe<T>>,
  timeoutMs: number,
  everyMs = 200,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await check();
    if (value) return value;
    if (Date.now() > deadline) throw new Error(`timed out after ${timeoutMs / 1000} s waiting for ${what}`);
    await sleep(everyMs);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// HTTP over the socket

interface Reply<T> {
  status: number;
  body: T;
  ms: number;
}

function http<T>(
  socket: string,
  method: string,
  path: string,
  body?: unknown,
  o: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<Reply<T>> {
  return new Promise((done, fail) => {
    const started = performance.now();
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const req = request(
      {
        socketPath: socket,
        method,
        path,
        signal: o.signal,
        timeout: o.timeoutMs ?? 120_000,
        headers: payload ? { "content-type": "application/json", "content-length": Buffer.byteLength(payload) } : {},
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("error", fail);
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let parsed: unknown = text;
          try {
            parsed = text ? JSON.parse(text) : null;
          } catch {
            // left as text
          }
          done({ status: res.statusCode ?? 0, body: parsed as T, ms: performance.now() - started });
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error(`${method} ${path}: no answer in time`)));
    req.on("error", fail);
    if (payload) req.write(payload);
    req.end();
  });
}

function readInfo(support: string): DaemonInfo | null {
  try {
    return JSON.parse(readFileSync(join(support, DAEMON_INFO_FILE), "utf8")) as DaemonInfo;
  } catch {
    return null;
  }
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

const round = (value: number, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits;

// ---------------------------------------------------------------------------------------------------------------------

describe("the daemon end to end, as Raycast runs it", { skip }, () => {
  let work = "";
  let support = "";
  let inbox = "";
  let unplugged = "";
  let locked = "";
  let synthetic = "";
  let traps = "";
  let codeRoot = "";
  let socket = "";
  let daemon: ChildProcess | null = null;
  let configuredAt = 0;
  let indexedAt = 0;
  /** Every process the test made or saw, killed in after() if one is still there. */
  const pids = new Set<number>();
  const measures: Record<string, unknown> = {};

  const log = () => readFileSync(join(support, "logs", "daemon.log"), "utf8");
  const call = <K extends keyof Routes>(route: K, body?: Routes[K]["req"], o?: { signal?: AbortSignal }) => {
    const [method, path] = (route as string).split(" ");
    return http<Routes[K]["res"]>(socket, method, path, body, o);
  };
  /** A route that must succeed. */
  const api = async <K extends keyof Routes>(route: K, body?: Routes[K]["req"]): Promise<Routes[K]["res"]> => {
    const reply = await call(route, body);
    assert.equal(reply.status, 200, `${route}: ${reply.status} ${JSON.stringify(reply.body)}`);
    return reply.body;
  };
  const status = () => api("GET /status");
  const search = (query: string, extra: Partial<Routes["POST /search"]["req"]> = {}) =>
    api("POST /search", { query, ...extra });
  const rel = (path: string) => path.slice(path.indexOf("/.testbed/") + "/.testbed/".length);

  /** Indexing is over: nothing pending, the rest of long files read, no pass running. */
  const idle = (s: Status, files: number) =>
    s.activity.state === "idle" &&
    s.main.total.files >= files &&
    s.main.total.pending === 0 &&
    s.main.unfinished.files === 0 &&
    (s.code?.total.pending ?? 0) === 0;

  async function waitIdle(files: number, timeoutMs: number): Promise<Status> {
    try {
      return await waitFor(
        "indexing to finish",
        async () => {
          const s = await status();
          return idle(s, files) ? s : null;
        },
        timeoutMs,
        250,
      );
    } catch (error) {
      const s = await status().catch(() => null);
      throw new Error(
        `${(error as Error).message}\nheld: ${s?.held}; activity: ${JSON.stringify(s?.activity)}\n` +
          log().split("\n").slice(-30).join("\n"),
      );
    }
  }

  async function startAndWait(): Promise<{ child: ChildProcess; info: DaemonInfo; ms: number }> {
    const started = performance.now();
    const before = readInfo(support);
    const child = spawnDaemon(support);
    pids.add(child.pid!);
    const info = await waitFor(
      "daemon.json and an answer on GET /status",
      async () => {
        const info = readInfo(support);
        if (!info || info.pid !== child.pid || info.pid === before?.pid) return null;
        const reply = await http<Status>(info.socket, "GET", "/status").catch(() => null);
        return reply?.status === 200 ? info : null;
      },
      15_000,
      100,
    );
    return { child, info, ms: performance.now() - started };
  }

  before(async () => {
    work = realpathSync(mkdtempSync(join(tmpdir(), "dig-up-e2e-")));
    support = join(work, "support");
    inbox = join(work, "inbox");
    unplugged = join(work, "unplugged");
    locked = join(work, "locked");
    mkdirSync(inbox);
    mkdirSync(locked);
    chmodSync(locked, 0o000);
    synthetic = realpathSync(join(testbed, "synthetic"));
    traps = realpathSync(join(testbed, "traps"));
    codeRoot = realpathSync(join(testbed, "code"));
    const { child, info, ms } = await startAndWait();
    daemon = child;
    socket = info.socket;
    measures.startToAnswerMs = Math.round(ms);
  });

  after(async () => {
    // Anything still running: daemons first (they stop their servers), then what a killed daemon left. Only processes
    // that are still ours: a pid that ended may have been given to another program since.
    const ours = (pid: number) =>
      alive(pid) &&
      ["dig-up-daemon", daemonJs, llamaServer, "digup-helper", work]
        .filter(Boolean)
        .some((mark) => ps(pid, "command").includes(mark));
    for (const pid of pids) if (ours(pid) && ps(pid, "command").includes("dig-up-daemon")) process.kill(pid, "SIGTERM");
    await sleep(3000);
    for (const pid of pids) if (ours(pid)) process.kill(pid, "SIGKILL");
    for (const name of ["llama-index.pid", "llama-query.pid"]) {
      let pid = 0;
      try {
        pid = Number(readFileSync(join(support, "logs", name), "utf8"));
      } catch {
        continue;
      }
      if (pid > 1 && alive(pid) && ps(pid, "command").includes(llamaServer)) process.kill(pid, "SIGKILL");
    }
    if (locked) chmodSync(locked, 0o700);
    if (socket) rmSync(dirname(socket), { recursive: true, force: true });
    if (work) rmSync(work, { recursive: true, force: true });
    if (process.env.DIGUP_E2E_REPORT)
      writeFileSync(process.env.DIGUP_E2E_REPORT, JSON.stringify(measures, null, 2) + "\n");
  });

  it("starts the way Raycast starts it", async () => {
    const info = readInfo(support)!;
    assert.equal(info.pid, daemon!.pid);
    assert.equal(info.apiVersion, API_VERSION);
    assert.match(info.socket, /^\/tmp\/digup-\d+-[0-9a-f]{8}\/d\.sock$/);
    assert.equal((statSync(dirname(info.socket)).mode & 0o777).toString(8), "700");
    assert.match(ps(info.pid, "command"), /dig-up-daemon/);
    assert.equal(Number(ps(info.pid, "ppid")), process.pid);
    const s = await status();
    assert.equal(s.pid, info.pid);
    assert.equal(s.apiVersion, API_VERSION);
    assert.equal(typeof s.startedAt, "number");
    assert.equal(s.lastError, null);
    // Before any folder is chosen there is nothing to do; llama.cpp isn't found without the setting.
    assert.deepEqual(s.folders, []);
    assert.equal(s.code, null);
  });

  it("refuses a bad setting and saves a good one at once", async () => {
    const bad = await call("POST /config", { folders: ["relative/folder"] });
    assert.equal(bad.status, 400);
    const config = await api("POST /config", {
      folders: [synthetic, traps, inbox, unplugged],
      codeFolders: [codeRoot],
      llamaServerPath: llamaServer,
      modelFolder: models,
    });
    configuredAt = performance.now();
    assert.deepEqual(config.folders, [synthetic, traps, inbox, unplugged]);
    assert.deepEqual(config.codeFolders, [codeRoot]);
    // The menu bar reads the file when no daemon runs (ui-contract-requests).
    const saved = JSON.parse(readFileSync(join(support, "config.json"), "utf8"));
    assert.deepEqual(saved.folders, config.folders);
    assert.deepEqual(saved.codeFolders, config.codeFolders);
    assert.deepEqual(await api("GET /config"), config);
    const s = await status();
    assert.deepEqual(s.setup, { state: "ready" }, "llama.cpp and the model are found where the settings say");
  });

  it("indexes the testbed, main and code, to DigUp's counts", { timeout: 300_000 }, async (t) => {
    // What the passes did, from the status every 250 ms.
    const seen = new Set<string>();
    const s = await waitFor(
      "indexing to finish",
      async () => {
        const s = await status();
        if (s.activity.state === "indexing") seen.add(`${s.activity.index}:${s.activity.pass}`);
        return idle(s, 88) ? s : null;
      },
      280_000,
      250,
    ).catch(async (error) => {
      const s = await status().catch(() => null);
      throw new Error(`${error.message}\nheld: ${s?.held}\n${log().split("\n").slice(-30).join("\n")}`);
    });
    indexedAt = performance.now();
    const seconds = (indexedAt - configuredAt) / 1000;
    t.diagnostic(`indexed in ${seconds.toFixed(1)} s; passes seen: ${[...seen].join(", ")}`);

    for (const [kind, want] of Object.entries(MAIN_COUNTS)) {
      const got = s.main.byKind[kind as keyof typeof s.main.byKind];
      assert.ok(got, kind);
      assert.equal(got.files, want.files, `${kind} files`);
      assert.equal(got.done, want.done, `${kind} done`);
      assert.equal(got.skipped, "skipped" in want ? want.skipped : 0, `${kind} skipped`);
      assert.equal(got.failed, 0, `${kind} failed`);
    }
    assert.equal(s.main.total.files, 88);
    assert.equal(s.main.vectors, 302);
    assert.equal(s.main.segments, 457);
    assert.ok(s.code, "code counts");
    // In place, .testbed/code/scripts/* is ignored by this repo's git (.gitignore lists .testbed/): 37 files, not 39.
    assert.equal(s.code.total.files, 37);
    assert.equal(s.code.total.failed, 0);
    assert.ok(s.code.total.done >= 34, `code done: ${s.code.total.done}`);
    assert.equal(s.held, null);
    assert.equal(s.lastError, null);
    assert.equal(s.encoder, "off", "nothing has asked for the query encoder yet");
    assert.deepEqual(s.missingFolders, [unplugged]);
    assert.deepEqual(s.unreadableFolders, []);
    assert.deepEqual(
      s.folderSummaries?.map((f) => [f.folder, f.missing]),
      [
        [synthetic, false],
        [traps, false],
        [inbox, false],
        [unplugged, true],
      ],
    );
    assert.equal(
      (s.folderSummaries ?? []).reduce((sum, f) => sum + f.files, 0),
      88,
    );
    assert.equal(s.codeFolderSummaries?.[0].files, 37);

    // The log's own timings: each step's "in N ms".
    const text = log();
    const ms = (pattern: RegExp) => [...text.matchAll(pattern)].map((m) => Number(m[1]));
    const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
    const phases = {
      syncMs: sum(ms(/ info sync: .* in (\d+) ms/g)),
      codeSyncMs: sum(ms(/ info code sync: .* in (\d+) ms/g)),
      newFilesMs: sum(ms(/ info index: new files: .* in (\d+) ms/g)),
      backfillMs: sum(ms(/ info index: backfill: .* in (\d+) ms/g)),
      codeMs: sum(ms(/ info index: code: .* in (\d+) ms/g)),
      restMs: sum(ms(/ info index: the rest of long files: .* in (\d+) ms/g)),
      indexServerReadyS: ms(/llama-server \(index\): ready in ([\d.]+) s/g)[0] ?? null,
    };
    const main = (phases.syncMs + phases.newFilesMs + phases.backfillMs + phases.restMs) / 1000;
    const code = (phases.codeSyncMs + phases.codeMs) / 1000;
    measures.indexing = {
      wallSeconds: round(seconds),
      mainSeconds: round(main),
      codeSeconds: round(code),
      ...phases,
      digup: DIGUP_SECONDS,
      passesSeen: [...seen],
    };
    t.diagnostic(
      `main ${main.toFixed(1)} s (DigUp ${DIGUP_SECONDS.main} s), code ${code.toFixed(1)} s (DigUp ${DIGUP_SECONDS.code} s)`,
    );
    assert.ok(seconds <= (DIGUP_SECONDS.main + DIGUP_SECONDS.code) * 1.5, `${seconds.toFixed(1)} s`);

    // Idle memory with the index server still lingering (it stops 60 s after the pass).
    const servers = children(daemon!.pid!, llamaServer);
    measures.memoryAfterIndexing = {
      daemon: memory(daemon!.pid!),
      llamaServers: servers.map((pid) => ({
        command: /--mmproj/.test(ps(pid, "command")) ? "index" : "query",
        ...memory(pid),
      })),
    };
    for (const pid of servers) {
      pids.add(pid);
      assert.match(ps(pid, "command"), /--port 189\d\d /, "llama-server keeps to DIGUP_PORT_RANGE");
    }
  });

  it("answers /setup with the status when everything is there already", async () => {
    // Guard: a setup that downloads would write into the model folder, which is DigUp's here.
    assert.equal((await status()).setup.state, "ready");
    const s = await api("POST /setup", {});
    assert.equal(s.setup.state, "ready");
  });

  it("searches: words at once, meaning once the encoder is warm", { timeout: 120_000 }, async (t) => {
    // The first meaning search finds the query encoder off: words only, with the "warming" note; it starts meanwhile.
    const first = await search("black and white striped animal", { meaning: true });
    assert.equal(first.meaning, false);
    assert.equal(first.note, "warming");
    // As the views do: ask again every 400 ms, up to 50 times.
    const warmStarted = performance.now();
    let warm = first;
    for (let i = 0; i < 50 && !warm.meaning; i++) {
      await sleep(400);
      warm = await search("black and white striped animal", { meaning: true });
    }
    assert.equal(warm.meaning, true, `note: ${warm.note}`);
    assert.equal(warm.note, null);
    measures.encoderWarmSeconds = round((performance.now() - warmStarted) / 1000);
    t.diagnostic(`query encoder warm in ${measures.encoderWarmSeconds} s`);
    assert.equal((await status()).encoder, "ready");

    // The words-only phase: no embedding, keyword hits.
    const words = await search("K7Q2LM", { meaning: false });
    assert.equal(words.meaning, false);
    assert.equal(words.note, null);
    assert.equal(words.ms.embed, 0);
    assert.equal(rel(words.hits[0].path), "synthetic/screenshots/shot_flight_booking.png");
    assert.ok(words.terms.length === 1, JSON.stringify(words.terms));

    // One DigUp eval query of each kind (docs/baseline/ours-eval-*.txt ranks each #1).
    const cases: Array<{ tag: string; q: string; expect: string; loc?: [number, number] }> = [
      { tag: "image", q: "black and white striped animal", expect: "synthetic/img/Animals-Zebra.jpg" },
      { tag: "screenshot", q: "payment declined error", expect: "synthetic/screenshots/shot_payment_error.png" },
      { tag: "pdf-page", q: "climbing mount fuji", expect: "synthetic/docs/Annual notes 2026.pdf", loc: [2, 2] },
      {
        tag: "video-moment",
        q: "zebra in a video",
        expect: "synthetic/video/penguin_zebra_parrot_18s.mp4",
        loc: [5, 12],
      },
      { tag: "audio", q: "airport announcement about a delay", expect: "synthetic/audio/speech_flight_delay.wav" },
      { tag: "exact", q: "K7Q2LM", expect: "synthetic/screenshots/shot_flight_booking.png" },
      { tag: "long", q: "sailing blind in thick fog", expect: "synthetic/long/Sailing log 2025.pdf", loc: [100, 100] },
      { tag: "doc", q: "grocery list", expect: "synthetic/docs/Groceries.txt" },
      {
        tag: "code",
        q: "code: retry a failed call with exponential backoff and random jitter",
        expect: "code/billing-service/billing/retry.py",
      },
      {
        tag: "code-name",
        q: "code: hamming distance",
        expect: "code/photo-organizer/Sources/PhotoOrganizer/DuplicateFinder.swift",
      },
    ];
    for (const c of cases) {
      const r = await search(c.q);
      assert.equal(r.meaning, true, `${c.tag}: meaning`);
      assert.equal(r.code, c.tag.startsWith("code"), `${c.tag}: code`);
      const top = r.hits[0];
      assert.ok(top, `${c.tag}: no hits`);
      assert.equal(rel(top.path), c.expect, `${c.tag} “${c.q}”`);
      if (c.loc) assert.ok(top.loc! >= c.loc[0] && top.loc! <= c.loc[1], `${c.tag}: loc ${top.loc}`);
      assert.ok(r.strong >= 1 && r.strong <= r.hits.length);
    }

    // Kinds: the unfiltered top for "a penguin" is the video; pictures only gives a penguin picture.
    const all = await search("a penguin");
    assert.equal(all.hits[0].kind, "video");
    const pictures = await search("a penguin", { kinds: ["image"] });
    assert.ok(pictures.hits.length > 0 && pictures.hits.every((h) => h.kind === "image"));
    assert.match(pictures.hits[0].path, /penguin/i);

    // "code:" notes, and a code hit's line.
    const hint = await search("code:");
    assert.equal(hint.note, "code-hint");
    assert.equal(hint.code, true);
    const code = await search("code: retry_with_backoff");
    assert.equal(rel(code.hits[0].path), "code/billing-service/billing/retry.py");
    assert.equal(code.hits[0].kind, "code");
    assert.equal(code.hits[0].focus, 8);

    // While typing: the last word is a prefix.
    const typing = await search("Yoshi", { meaning: false, prefixLast: true });
    assert.equal(rel(typing.hits[0].path), "synthetic/docs/Annual notes 2026.pdf");
  });

  it("prewarms: with the encoder ready already, it answers at once", async () => {
    // The meaning searches above loaded the vectors; the quit test below prewarms a daemon that hasn't.
    const reply = await call("POST /prewarm", {});
    assert.equal(reply.body.encoder, "ready");
    assert.ok(reply.ms < 200, `${reply.ms} ms`);
  });

  it("measures query latency", { timeout: 120_000 }, async (t) => {
    const synthetic = JSON.parse(readFileSync(join(repo, "test/fixtures/digup/evals/synthetic.json"), "utf8")) as {
      queries: Array<{ q: string }>;
    };
    const texts = synthetic.queries.map((q) => q.q);
    // Meaning with the encoder warm and a text it hasn't seen: embed + search.
    const meaning: number[] = [];
    const embed: number[] = [];
    const scoring: number[] = [];
    for (const q of texts.slice(0, 20)) {
      const r = await call("POST /search", { query: `${q} please`, meaning: true });
      assert.equal(r.body.meaning, true);
      meaning.push(r.ms);
      embed.push(r.body.ms.embed);
      scoring.push(r.body.ms.search);
    }
    // Words only (the first phase while typing).
    const words: number[] = [];
    for (const q of texts.slice(20)) {
      const r = await call("POST /search", { query: q, meaning: false, prefixLast: true });
      words.push(r.ms);
    }
    // The meaning phase after the words phase embedded the text ahead.
    await sleep(500);
    const ahead: number[] = [];
    for (const q of texts.slice(20)) {
      const r = await call("POST /search", { query: q, meaning: true });
      ahead.push(r.ms);
    }
    const summary = (values: number[]) => ({ median: round(median(values)), p95: round(percentile(values, 95)) });
    measures.latencyMs = {
      wordsPhaseRoundTrip: summary(words),
      meaningPhaseRoundTrip: summary(meaning),
      meaningEmbed: summary(embed),
      meaningScoring: summary(scoring),
      meaningAfterEmbedAheadRoundTrip: summary(ahead),
    };
    t.diagnostic(`latency (ms): ${JSON.stringify(measures.latencyMs)}`);
    assert.ok(median(words) < 100, "words phase");
    assert.ok(median(meaning) < 500, "meaning phase");

    const servers = children(daemon!.pid!, llamaServer);
    for (const pid of servers) pids.add(pid);
    measures.memoryWarm = {
      daemon: memory(daemon!.pid!),
      llamaServers: servers.map((pid) => ({
        command: /--mmproj/.test(ps(pid, "command")) ? "index" : "query",
        ...memory(pid),
      })),
    };
  });

  it("estimates folders, and stops an estimate the client gave up on", { timeout: 120_000 }, async (t) => {
    const estimates = await api("POST /estimate", { folders: [synthetic, traps, unplugged] });
    assert.deepEqual(
      estimates.map((e) => e.folder),
      [synthetic, traps, unplugged],
      "folders come back as sent",
    );
    assert.equal(estimates[0].readable, true);
    assert.equal(estimates[0].files + estimates[1].files, 88);
    assert.ok(estimates[0].seconds > 0);
    assert.ok((estimates[0].subfolders ?? []).length > 0);
    assert.equal(estimates[2].readable, false);
    const code = await api("POST /estimate", { folders: [codeRoot], code: true });
    assert.equal(code[0].files, 37);
    assert.ok((code[0].bytes ?? 0) > 0);

    // A big folder: 40,000 files.
    const big = join(work, "big");
    for (let d = 0; d < 100; d++) {
      mkdirSync(join(big, `d${d}`), { recursive: true });
      for (let f = 0; f < 400; f++) writeFileSync(join(big, `d${d}`, `note ${f}.txt`), "");
    }
    const helpers = () => children(daemon!.pid!, "digup-helper").length;
    const helpersBefore = helpers();
    const whole = await call("POST /estimate", { folders: [big] });
    assert.equal(whole.status, 200);
    assert.equal(whole.body[0].files, 40_000);
    const controller = new AbortController();
    const asked = call("POST /estimate", { folders: [big] }, { signal: controller.signal });
    const abortAfter = Math.max(20, whole.ms / 4);
    await sleep(abortAfter);
    const aborted = performance.now();
    controller.abort();
    await assert.rejects(asked, { name: "AbortError" });
    await waitFor("the daemon to note the cancel", () => /POST \/estimate cancelled by the client/.test(log()), 5000);
    await waitFor("the estimate's helper to close", () => helpers() <= helpersBefore, 5000);
    measures.estimate = {
      bigFolderFiles: 40_000,
      wholeMs: Math.round(whole.ms),
      abortedAfterMs: Math.round(abortAfter),
      cancelSeenMs: Math.round(performance.now() - aborted),
    };
    t.diagnostic(`estimate of 40,000 files: ${Math.round(whole.ms)} ms; aborted after ${Math.round(abortAfter)} ms`);
    assert.equal((await status()).pid, daemon!.pid, "still serving");
    rmSync(big, { recursive: true, force: true });
  });

  it("draws a preview of each kind, and keeps it", { timeout: 120_000 }, async () => {
    const cases: Array<Routes["POST /thumb"]["req"] & { png: boolean }> = [
      { kind: "screenshot", path: join(synthetic, "screenshots/shot_payment_error.png"), png: true },
      { kind: "image", path: join(synthetic, "img/Animals-Zebra.jpg"), png: false },
      { kind: "pdf", path: join(synthetic, "docs/Annual notes 2026.pdf"), loc: 2, words: ["Yoshida"], png: true },
      { kind: "doc", path: join(synthetic, "docs/Groceries.txt"), png: true },
      { kind: "audio", path: join(synthetic, "audio/speech_flight_delay.wav"), loc: 0, locEnd: 5, png: true },
      { kind: "video", path: join(synthetic, "video/penguin_zebra_parrot_18s.mp4"), loc: 6, png: false },
      { kind: "code", path: join(codeRoot, "billing-service/billing/retry.py"), png: true },
    ];
    for (const { png, ...request } of cases) {
      const first = await call("POST /thumb", request);
      assert.equal(first.status, 200, `${request.kind}: ${JSON.stringify(first.body)}`);
      const thumb = first.body;
      assert.ok(thumb.path.startsWith(join(support, "thumbs")), thumb.path);
      assert.ok(thumb.width > 0 && thumb.height > 0, request.kind);
      assert.ok(Math.max(thumb.width, thumb.height) <= 600, `${request.kind}: ${thumb.width}×${thumb.height}`);
      const head = readFileSync(thumb.path).subarray(0, 4);
      assert.equal(head.readUInt32BE(0) === 0x89504e47, png, `${request.kind}: ${png ? "PNG" : "JPEG"}`);
      const again = await call("POST /thumb", request);
      assert.equal(again.body.path, thumb.path, `${request.kind}: cached`);
      // To look at them: DIGUP_E2E_THUMBS=<folder>.
      const keep = process.env.DIGUP_E2E_THUMBS;
      if (keep) copyFileSync(thumb.path, join(keep, `${request.kind}${png ? ".png" : ".jpg"}`));
    }
    const gone = await call("POST /thumb", { kind: "image", path: join(work, "no such picture.jpg") });
    assert.ok(gone.status >= 400);
  });

  it("gives a segment's whole text", async () => {
    const doc = await search("grocery list");
    const text = await api("POST /segment-text", { segmentId: doc.hits[0].segmentId, code: false });
    assert.ok(text.text && /milk|eggs|bread/i.test(text.text), String(text.text));
    const code = await search("code: retry_with_backoff");
    const stretch = await api("POST /segment-text", { segmentId: code.hits[0].segmentId, code: true });
    assert.match(String(stretch.text), /def retry_with_backoff/);
    assert.equal((await api("POST /segment-text", { segmentId: 987_654, code: false })).text, null);
  });

  it("lists files by state and kind", async () => {
    const skipped = await api("POST /files", { states: ["skipped"] });
    assert.equal(skipped.length, 7);
    assert.deepEqual([...new Set(skipped.map((f) => f.kind))].sort(), ["audio", "image"]);
    assert.ok(skipped.every((f) => f.state === "skipped" && f.detail));
    const code = await api("POST /files", { code: true, states: ["done"], limit: 5 });
    assert.equal(code.length, 5);
    assert.ok(code.every((f) => f.kind === "code" && f.path.startsWith(codeRoot)));
    assert.equal((await api("POST /files", { kinds: ["pdf"] })).length, 5);
  });

  it("suggests code folders", async () => {
    const folders = await api("POST /suggest-code-folders", {});
    assert.ok(Array.isArray(folders));
    assert.ok(folders.every((f) => typeof f === "string" && f.startsWith("/")));
  });

  it("tells which folders it can read", async () => {
    const access = await api("POST /access", { folders: [synthetic, locked, unplugged] });
    assert.deepEqual(
      access.map((a) => [a.folder, a.readable]),
      [
        [synthetic, true],
        [locked, false],
        [unplugged, false],
      ],
    );
    assert.match(String(access[1].error), /doesn't let Dig Up read it/);
    assert.equal(access[2].error, "it isn't there");
  });

  it("routes /open-pdf and /open-media without opening anything", async () => {
    // No dry run exists: only requests that fail before the Finder is asked.
    const pdf = await call("POST /open-pdf", { page: 2, words: [] } as unknown as Routes["POST /open-pdf"]["req"]);
    assert.equal(pdf.status, 400);
    const media = await call("POST /open-media", {
      path: join(work, "none.mp4"),
    } as unknown as Routes["POST /open-media"]["req"]);
    assert.equal(media.status, 400);
    // Through the helper: it refuses a time it can't use before it looks for an app (helper/Open.swift).
    const far = await call("POST /open-media", { path: join(work, "none.mp4"), seconds: 1e10, player: null });
    assert.equal(far.status, 500);
    assert.match(JSON.stringify(far.body), /must be a number of seconds/);
  });

  it("indexes a new file within seconds, without being asked", { timeout: 60_000 }, async (t) => {
    const written = performance.now();
    writeFileSync(join(inbox, "kayak note.txt"), "The zorblaxian kayak paddle needs new grips before the lake trip.\n");
    const hit = await waitFor(
      "the new file to be searchable",
      async () => {
        const r = await search("zorblaxian", { meaning: false });
        const top = r.hits[0];
        return top && top.path === join(inbox, "kayak note.txt") ? top : null;
      },
      20_000,
      100,
    );
    assert.equal(hit.kind, "doc");
    measures.newFileSearchableMs = Math.round(performance.now() - written);
    t.diagnostic(`a new file is found by its words ${measures.newFileSearchableMs} ms after it was written`);
    await waitFor(
      "its vectors",
      async () => {
        const done = await api("POST /files", { states: ["done"], kinds: ["doc"] });
        return done.some((f) => f.path === join(inbox, "kayak note.txt"));
      },
      20_000,
    );
    assert.match(log(), /watch: /);
    assert.match(log(), /index: new files: 1 done/);
    const meaning = await search("paddling on a lake");
    assert.ok(meaning.hits.slice(0, 5).some((h) => h.path === join(inbox, "kayak note.txt")));
  });

  it("holds everything while paused, then reads new files before the rest", { timeout: 240_000 }, async (t) => {
    const paused = await api("POST /pause", { paused: true });
    assert.equal(paused.held, "paused");
    assert.equal((await api("GET /config")).paused, true);
    assert.equal(JSON.parse(readFileSync(join(support, "config.json"), "utf8")).paused, true);

    // Everything to read again, and a new file, while paused: nothing moves.
    await api("POST /reindex", {});
    writeFileSync(join(inbox, "canoe note.txt"), "Quorvex canoe rental closes at six on Sundays.\n");
    assert.deepEqual(await api("POST /sync", {}), {});
    await sleep(3000);
    let s = await status();
    assert.equal(s.held, "paused");
    assert.equal(s.activity.state, "idle");
    assert.equal(s.main.vectors, 0, "the reindex dropped the vectors");
    assert.ok(s.main.total.pending >= 80, `pending: ${s.main.total.pending}`);
    assert.equal((await search("quorvex", { meaning: false })).hits.length, 0, "the new file isn't read while paused");
    // Search still works while paused (names and kept words).
    assert.ok((await search("Groceries", { meaning: false })).hits.length > 0);
    const linesBefore = log().split("\n").length;

    const resumedAt = performance.now();
    const resumed = await api("POST /pause", { paused: false });
    assert.notEqual(resumed.held, "paused");
    s = await waitIdle(90, 200_000);
    const seconds = (performance.now() - resumedAt) / 1000;
    const lines = log().split("\n").slice(linesBefore);
    const firstNew = lines.findIndex((line) => / index: new files: /.test(line));
    const firstBackfill = lines.findIndex((line) => / index: backfill: /.test(line));
    assert.ok(firstNew >= 0, "a new-files run");
    assert.ok(firstBackfill > firstNew, "the new file came before the rest");
    assert.equal(s.main.vectors, 302 + 2, "the same vectors again, and one per new note");
    assert.equal(s.main.total.files, 90);
    assert.equal((await search("quorvex", { meaning: false })).hits[0]?.path, join(inbox, "canoe note.txt"));
    measures.reindexMainSeconds = round(seconds);
    t.diagnostic(`main index read again in ${seconds.toFixed(1)} s`);
  });

  it("reads the code index again from scratch", { timeout: 120_000 }, async (t) => {
    const before = (await status()).code!;
    const started = performance.now();
    await api("POST /reindex", { code: true });
    const s = await waitFor(
      "the code index",
      async () => {
        const s = await status();
        return s.activity.state === "idle" && s.code!.total.pending === 0 && s.code!.vectors > 0 ? s : null;
      },
      100_000,
      250,
    );
    measures.reindexCodeSeconds = round((performance.now() - started) / 1000);
    t.diagnostic(`code index read again in ${measures.reindexCodeSeconds} s`);
    assert.equal(s.code!.vectors, before.vectors);
    assert.equal(s.code!.total.done, before.total.done);
    assert.equal(
      rel((await search("code: hamming distance")).hits[0].path),
      "code/photo-organizer/Sources/PhotoOrganizer/DuplicateFinder.swift",
    );
  });

  it("a second daemon for the same folder exits at once and quietly", { timeout: 30_000 }, async () => {
    const second = spawnDaemon(support);
    pids.add(second.pid!);
    assert.equal(await exited(second, 20_000), 0);
    assert.match(log(), /daemon: another daemon is running/);
    assert.equal(readInfo(support)?.pid, daemon!.pid);
    assert.equal((await status()).pid, daemon!.pid);
  });

  it(
    "is started again by client.ts after it was killed, and leaves when that parent goes",
    { timeout: 90_000 },
    async (t) => {
      const killed = daemon!.pid!;
      // The servers and helpers the killed daemon leaves behind.
      const servers = children(killed, llamaServer);
      const helpers = children(killed, "digup-helper");
      for (const pid of [...servers, ...helpers]) pids.add(pid);
      assert.ok(servers.length > 0, "a llama-server runs (the query server stays up 10 min)");
      const before = await status();
      process.kill(killed, "SIGKILL");
      await waitFor("the daemon to die", () => !alive(killed), 5000, 50);

      // The real client (src/lib/client.ts) with a stand-in for @raycast/api, in a process that stays, as Raycast's does.
      const stub = join(work, "raycast-api.cjs");
      writeFileSync(
        stub,
        "exports.environment = { supportPath: process.env.DIGUP_SUPPORT, assetsPath: process.env.DIGUP_ASSETS };\n" +
          "exports.getPreferenceValues = () => ({});\n",
      );
      const preload = join(work, "preload.cjs");
      writeFileSync(
        preload,
        `const Module = require("node:module");\nconst resolve = Module._resolveFilename;\n` +
          `Module._resolveFilename = function (request, ...rest) {\n` +
          `  return request === "@raycast/api" ? ${JSON.stringify(stub)} : resolve.call(this, request, ...rest);\n};\n`,
      );
      const driver = join(work, "raycast.ts");
      writeFileSync(
        driver,
        `import { api } from ${JSON.stringify(join(repo, "src/lib/client"))};\n` +
          `void (async () => {\n` +
          `  const started = performance.now();\n` +
          `  try {\n` +
          `    const s = await api("GET /status");\n` +
          `    console.log(JSON.stringify({ ok: true, pid: s.pid, files: s.main.total.files, vectors: s.main.vectors, ms: performance.now() - started }));\n` +
          `  } catch (error) {\n` +
          `    console.log(JSON.stringify({ ok: false, error: String(error) }));\n` +
          `  }\n` +
          `  setInterval(() => {}, 1 << 30);\n` +
          `})();\n`,
      );
      const raycast = spawn(
        process.execPath,
        ["--no-warnings=ExperimentalWarning", "--require", preload, "--import", "tsx", driver],
        {
          cwd: repo,
          env: { ...daemonEnv(), DIGUP_SUPPORT: support, DIGUP_ASSETS: assets },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      pids.add(raycast.pid!);
      let stderr = "";
      raycast.stderr!.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
      const line = await new Promise<string>((done, fail) => {
        let out = "";
        const timer = setTimeout(() => fail(new Error(`client.ts didn't answer: ${stderr}`)), 30_000);
        raycast.stdout!.on("data", (chunk: Buffer) => {
          out += chunk.toString();
          if (out.includes("\n")) {
            clearTimeout(timer);
            done(out.split("\n")[0]);
          }
        });
      });
      const answer = JSON.parse(line) as {
        ok: boolean;
        pid: number;
        files: number;
        vectors: number;
        ms: number;
        error?: string;
      };
      assert.ok(answer.ok, answer.error);
      assert.notEqual(answer.pid, killed);
      pids.add(answer.pid);
      assert.equal(answer.files, before.main.total.files, "the same index");
      assert.equal(answer.vectors, before.main.vectors);
      assert.equal(Number(ps(answer.pid, "ppid")), raycast.pid, "client.ts started it");
      measures.restartByClientMs = Math.round(answer.ms);
      t.diagnostic(`client.ts started a new daemon in ${measures.restartByClientMs} ms`);
      socket = readInfo(support)!.socket;
      // The new daemon stops what the killed one left running: its helpers end with their pipe, its servers by pid file.
      await waitFor("the killed daemon's llama-servers to stop", () => servers.every((pid) => !alive(pid)), 10_000);
      await waitFor("the killed daemon's helpers to end", () => helpers.every((pid) => !alive(pid)), 10_000);
      assert.equal(existsSync(join(tmpdir(), `DigUpRaycast-${killed}`)), false, "its scratch folder is gone");

      // Raycast goes: the daemon is left to launchd and leaves too (checked every 5 s).
      const gone = performance.now();
      raycast.kill("SIGKILL");
      await waitFor("the daemon to leave with its parent", () => !alive(answer.pid), 20_000, 100);
      measures.leavesAfterParentMs = Math.round(performance.now() - gone);
      t.diagnostic(`left ${measures.leavesAfterParentMs} ms after its parent`);
      assert.match(log(), /daemon: stopping \(parent exited\)/);
      assert.equal(readInfo(support), null, "daemon.json is gone");
      assert.equal(existsSync(socket), false, "the socket is gone");
      daemon = null;
    },
  );

  it("prewarms a fresh daemon, then quits on request and leaves nothing behind", { timeout: 60_000 }, async (t) => {
    const { child, info } = await startAndWait();
    daemon = child;
    socket = info.socket;
    // A search view opening: the query encoder starts and the vectors load (main: 302 + the two notes).
    const prewarm = await call("POST /prewarm", {});
    assert.equal(prewarm.status, 200);
    assert.ok(["starting", "ready"].includes(prewarm.body.encoder), prewarm.body.encoder);
    assert.match(log(), /engine: 304 vectors loaded in \d+ ms/);
    assert.match(log(), /engine: \d+ code vectors loaded in \d+ ms/);
    await waitFor("the encoder", async () => (await status()).encoder === "ready", 30_000);
    measures.prewarmMs = Math.round(prewarm.ms);
    t.diagnostic(`prewarm on a fresh daemon: ${measures.prewarmMs} ms`);
    const servers = children(info.pid, llamaServer);
    assert.equal(servers.length, 1, "the query server");
    const workers = [...children(info.pid, llamaServer), ...children(info.pid, "digup-helper")];
    for (const pid of workers) pids.add(pid);
    assert.deepEqual(await api("POST /quit", {}), {});
    assert.equal(await exited(child, 15_000), 0);
    assert.equal(existsSync(info.socket), false, "socket");
    assert.equal(existsSync(dirname(info.socket)), false, "socket folder");
    assert.equal(readInfo(support), null, "daemon.json");
    assert.equal(existsSync(join(support, "daemon.pid")), false, "daemon.pid");
    await waitFor("its servers and helpers to end", () => workers.every((pid) => !alive(pid)), 10_000);
    assert.match(log(), /daemon: stopped \(quit\)/);
    daemon = null;
  });

  it("reports the numbers", (t) => {
    t.diagnostic(JSON.stringify(measures));
  });
});
