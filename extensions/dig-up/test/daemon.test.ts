// engine/daemon.ts: the process shell, in-process with a fake service, over its real Unix socket. Also a daemon run as
// its own process for signals and unhandled errors, and the log rotation.

import assert from "node:assert/strict";
import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { after, afterEach, describe, it } from "node:test";
import {
  API_VERSION,
  DAEMON_INFO_FILE,
  type Config,
  type DaemonInfo,
  type FolderEstimate,
  type IndexCounts,
  type Status,
} from "../engine/api";
import {
  type Daemon,
  type DaemonOptions,
  type ServiceLike,
  type ServiceOptions,
  HttpError,
  portRangeFrom,
  rotatingLog,
  startDaemon,
} from "../engine/daemon";
import type { PowerStatus } from "../engine/helper";
import { silentLog } from "../engine/log";
import { type Paths, makePaths } from "../engine/paths";

const PROJECT = resolve(__dirname, "..");
const AC: PowerStatus = { onBattery: false, lowPower: false, thermal: "nominal" };
const sleep = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

const supports: string[] = [];
const running: Daemon[] = [];
afterEach(async () => {
  for (const daemon of running.splice(0)) await daemon.stop("test over");
});
after(() => {
  for (const support of supports) {
    rmSync(support, { recursive: true, force: true });
    rmSync(dirname(makePaths(support, support).socket), { recursive: true, force: true });
  }
});

function tempSupport(): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "digup-daemon-")));
  supports.push(dir);
  return dir;
}

// ---------------------------------------------------------------------------------------------------------------------
// A fake service that records what the daemon asks of it.

const noCounts = (): IndexCounts => ({
  byKind: {},
  total: { files: 0, done: 0, partial: 0, pending: 0, skipped: 0, failed: 0 },
  vectors: 0,
  segments: 0,
  unfinished: { files: 0, units: 0 },
});

class FakeService implements ServiceLike {
  readonly calls: string[] = [];
  readonly signals: AbortSignal[] = [];
  config: Config;
  held: Status["held"] = null;
  heldUntil: number | null = null;
  /** What could be seen from inside the constructor. */
  readonly seenAtStart: { infoFile: boolean };
  stopForever = false;
  stopDelayMs = 0;

  constructor(readonly o: ServiceOptions) {
    this.config = o.config;
    this.seenAtStart = { infoFile: existsSync(join(o.paths.support, DAEMON_INFO_FILE)) };
  }

  private note(call: string) {
    this.calls.push(call);
  }

  start() {
    this.note(`start held=${this.held}`);
  }
  stop() {
    this.note("stop");
    return this.stopForever ? new Promise<void>(() => {}) : sleep(this.stopDelayMs);
  }
  requestSync(index?: "main" | "code") {
    this.note(`sync ${index ?? "all"}`);
  }
  setConfig(config: Config) {
    this.config = config;
    this.note("setConfig");
  }
  setHeld(reason: Status["held"], until?: number | null) {
    this.held = reason;
    this.heldUntil = until ?? null;
    this.note(`held ${reason}`);
  }
  status(): Status {
    return {
      apiVersion: 0,
      pid: 0,
      setup: { state: "ready" },
      activity: { state: "idle" },
      held: this.held,
      main: noCounts(),
      code: null,
      encoder: "off",
      lastError: null,
      folders: this.config.folders,
      codeFolders: this.config.codeFolders,
    };
  }
  async search(r: { query: string }, signal?: AbortSignal) {
    if (signal) this.signals.push(signal);
    this.note(`search ${r.query}`);
    if (r.query === "slow")
      await new Promise((_done, fail) => signal?.addEventListener("abort", () => fail(signal.reason)));
    return {
      hits: [],
      strong: 0,
      code: false,
      meaning: false,
      note: null,
      terms: [r.query],
      ms: { embed: 0, search: 0 },
    };
  }
  async prewarm() {
    this.note("prewarm");
    return "starting" as const;
  }
  async setup() {
    this.note("setup");
    // A setup runs for minutes: the route must not wait for it.
    await new Promise(() => {});
  }
  async estimate(r: { folders: string[] }, signal?: AbortSignal): Promise<FolderEstimate[]> {
    this.note(`estimate ${r.folders.join(",")}`);
    if (signal) this.signals.push(signal);
    if (r.folders.includes("/slow")) {
      await new Promise((_done, fail) => signal?.addEventListener("abort", () => fail(signal.reason)));
    }
    return r.folders.map((folder) => ({ folder, files: 1, byKind: {}, skipped: {}, seconds: 2, laterSeconds: 0 }));
  }
  async reindex(code: boolean) {
    this.note(`reindex ${code}`);
  }
  async thumb(r: { path: string }) {
    if (r.path === "/gone") throw Object.assign(new Error("no such file"), { status: 404 });
    if (r.path === "/boom") throw new Error("the helper crashed");
    return { path: `${r.path}.png`, width: 10, height: 20 };
  }
  files() {
    return [{ path: "/a.pdf", kind: "pdf" as const, state: "done" as const, detail: null }];
  }
  suggestCodeFolders() {
    return ["/Users/me/Code"];
  }
  segmentText(segmentId: number, code: boolean) {
    return `segment ${segmentId} ${code}`;
  }
  async openPdf(r: { page: number }) {
    return { how: r.page > 1 ? ("search" as const) : ("plain" as const) };
  }
  async openMedia() {
    return { how: "moment" as const };
  }
  async access(folders: string[]) {
    return folders.map((folder) => ({ folder, readable: folder !== "/locked" }));
  }
}

async function launch(over: Partial<DaemonOptions> = {}, support = tempSupport()) {
  const paths = makePaths(support, join(support, "assets"));
  let fake: FakeService | null = null;
  const daemon = await startDaemon({
    paths,
    log: silentLog,
    makeService: (o) => (fake = new FakeService(o)),
    power: async () => AC,
    watcher: { volumes: null },
    ...over,
  });
  if (daemon) running.push(daemon);
  return { daemon, fake: fake as FakeService | null, paths, support };
}

// ---------------------------------------------------------------------------------------------------------------------
// HTTP over the socket, as src/lib/client.ts does it.

interface Reply {
  status: number;
  // Each route answers its own JSON shape; the assertions say which.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
}

function call(
  socket: string,
  method: string,
  path: string,
  body?: unknown,
  o: { raw?: string | Buffer; signal?: AbortSignal } = {},
): Promise<Reply> {
  return new Promise((done, fail) => {
    const payload = o.raw ?? (body === undefined ? undefined : JSON.stringify(body));
    const req = request(
      {
        socketPath: socket,
        method,
        path,
        signal: o.signal,
        headers: payload ? { "content-type": "application/json", "content-length": Buffer.byteLength(payload) } : {},
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          done({ status: res.statusCode ?? 0, body: text ? JSON.parse(text) : null });
        });
      },
    );
    req.on("error", fail);
    if (payload) req.write(payload);
    req.end();
  });
}

const infoOf = (paths: Paths): DaemonInfo =>
  JSON.parse(readFileSync(join(paths.support, DAEMON_INFO_FILE), "utf8")) as DaemonInfo;

// ---------------------------------------------------------------------------------------------------------------------

describe("starting", () => {
  it("locks, makes a private socket folder, and writes daemon.json only once it listens", async () => {
    const { daemon, fake, paths } = await launch({ startedAt: 1234 });
    assert.ok(daemon && fake);
    assert.equal(fake.seenAtStart.infoFile, false, "no daemon.json while the service was being made");
    assert.deepEqual(infoOf(paths), {
      pid: process.pid,
      socket: paths.socket,
      apiVersion: API_VERSION,
      startedAt: 1234,
    });
    assert.deepEqual(daemon.info, infoOf(paths));
    assert.equal(readFileSync(paths.pidFile, "utf8"), `${process.pid}\n`);
    assert.equal(statSync(dirname(paths.socket)).mode & 0o777, 0o700);
    assert.ok(lstatSync(paths.socket).isSocket());
    assert.ok(paths.socket.length < 104, "fits sun_path");
    const status = await call(paths.socket, "GET", "/status");
    assert.equal(status.status, 200);
    assert.equal(status.body.apiVersion, API_VERSION);
    assert.equal(status.body.pid, process.pid);
  });

  it("decides the holds before the service starts (a pause kept from before holds the first sync)", async () => {
    const support = tempSupport();
    writeFileSync(join(support, "config.json"), JSON.stringify({ paused: true }));
    const { fake } = await launch({}, support);
    assert.deepEqual(fake?.calls.slice(0, 2), ["held paused", "start held=paused"]);
  });

  it("makes an existing socket folder private again", async () => {
    const support = tempSupport();
    const folder = dirname(makePaths(support, support).socket);
    mkdirSync(folder, { mode: 0o755 });
    await launch({}, support);
    assert.equal(statSync(folder).mode & 0o777, 0o700);
  });

  it("refuses a socket folder that is a link, and lets go of the lock", async () => {
    const support = tempSupport();
    const folder = dirname(makePaths(support, support).socket);
    symlinkSync(tempSupport(), folder);
    await assert.rejects(launch({}, support), /isn't a folder/);
    rmSync(folder);
    const { daemon } = await launch({}, support);
    assert.ok(daemon, "the lock was released");
  });

  it("lets go of the lock when the service can't be made", async () => {
    const support = tempSupport();
    await assert.rejects(
      launch(
        {
          makeService: () => {
            throw new Error("can't open the index");
          },
        },
        support,
      ),
      /can't open the index/,
    );
    assert.ok((await launch({}, support)).daemon);
  });
});

describe("one daemon per support folder", () => {
  it("refuses a second one quietly while the first runs", async () => {
    const first = await launch();
    const second = await launch({}, first.support);
    assert.equal(second.daemon, null);
    assert.equal(second.fake, null, "no service was made");
    assert.equal((await call(first.paths.socket, "GET", "/status")).status, 200);
    assert.equal(infoOf(first.paths).pid, process.pid);
  });

  it("lets exactly one of two that start together run", async () => {
    const support = tempSupport();
    const both = await Promise.all([launch({}, support), launch({}, support)]);
    assert.equal(both.filter((one) => one.daemon !== null).length, 1);
  });

  it("waits for one that is stopping, then takes over (the client's restart)", async () => {
    const old = await launch();
    old.fake!.stopDelayMs = 400;
    await call(old.paths.socket, "POST", "/quit", {});
    const began = Date.now();
    const next = await launch({}, old.support);
    assert.ok(next.daemon, "the new daemon started");
    assert.equal(await old.daemon!.stopped, "quit");
    assert.ok(Date.now() - began >= 300, "it waited for the lock");
    assert.equal(infoOf(next.paths).startedAt, next.daemon.info.startedAt);
    assert.equal((await call(next.paths.socket, "GET", "/status")).status, 200);
  });

  it("takes over from one that died: its pid file and socket are left behind", async () => {
    const support = tempSupport();
    const paths = makePaths(support, support);
    mkdirSync(dirname(paths.socket), { mode: 0o700 });
    // A process that listens on the socket and is killed: the socket file stays, nobody answers.
    const dead = spawnSync(process.execPath, [
      "-e",
      `require("net").createServer().listen(${JSON.stringify(paths.socket)}, () => {` +
        `require("fs").writeFileSync(${JSON.stringify(paths.pidFile)}, process.pid + "\\n");` +
        `process.kill(process.pid, "SIGKILL"); })`,
    ]);
    assert.equal(dead.signal, "SIGKILL");
    assert.ok(lstatSync(paths.socket).isSocket(), "a stale socket is there");
    writeFileSync(join(support, DAEMON_INFO_FILE), JSON.stringify({ pid: dead.pid, socket: paths.socket }));
    const { daemon } = await launch({}, support);
    assert.ok(daemon);
    assert.equal(readFileSync(paths.pidFile, "utf8"), `${process.pid}\n`);
    assert.equal(infoOf(paths).pid, process.pid);
    assert.equal((await call(paths.socket, "GET", "/status")).status, 200);
  });
});

describe("routes", () => {
  it("serves every route of api.ts", async () => {
    const { fake, paths } = await launch();
    const docs = join(paths.support, "Docs");
    mkdirSync(docs);
    const s = paths.socket;
    const ok = async (method: string, path: string, body?: unknown) => {
      const reply = await call(s, method, path, body);
      assert.equal(reply.status, 200, `${method} ${path}: ${JSON.stringify(reply.body)}`);
      return reply.body;
    };

    assert.equal((await ok("GET", "/status")).apiVersion, API_VERSION);
    assert.deepEqual((await ok("POST", "/search", { query: "beach" })).terms, ["beach"]);
    assert.deepEqual(await ok("POST", "/prewarm", {}), { encoder: "starting" });
    assert.deepEqual(await ok("POST", "/sync", {}), {});
    assert.ok(fake!.calls.includes("sync all"));
    assert.equal((await ok("GET", "/config")).paused, false);
    const config = await ok("POST", "/config", { folders: [docs, join(docs, "Inner")], excludedExtensions: [".HEIC"] });
    assert.deepEqual(config.folders, [docs]);
    assert.deepEqual(config.excludedExtensions, ["heic"]);
    assert.deepEqual(fake!.config.folders, [docs], "the service got the new settings");
    assert.deepEqual(await ok("POST", "/estimate", { folders: ["/a"] }), [
      { folder: "/a", files: 1, byKind: {}, skipped: {}, seconds: 2, laterSeconds: 0 },
    ]);
    assert.equal((await ok("POST", "/setup", {})).setup.state, "ready", "replies before setup ends");
    assert.deepEqual(await ok("POST", "/reindex", { code: true }), {});
    assert.ok(fake!.calls.includes("reindex true"));
    assert.deepEqual(await ok("POST", "/thumb", { path: "/a.jpg", kind: "image" }), {
      path: "/a.jpg.png",
      width: 10,
      height: 20,
    });
    assert.equal((await ok("POST", "/files", {})).length, 1);
    assert.deepEqual(await ok("POST", "/suggest-code-folders", {}), ["/Users/me/Code"]);
    assert.deepEqual(await ok("POST", "/segment-text", { segmentId: 7, code: true }), { text: "segment 7 true" });
    assert.deepEqual(await ok("POST", "/open-pdf", { path: "/a.pdf", page: 3, words: ["x"] }), { how: "search" });
    assert.deepEqual(await ok("POST", "/open-media", { path: "/a.mov", seconds: 4, player: null }), { how: "moment" });
    assert.deepEqual(await ok("POST", "/access", { folders: ["/locked", "/open"] }), [
      { folder: "/locked", readable: false },
      { folder: "/open", readable: true },
    ]);
    // POST /quit is covered under "stopping".
  });

  it("pauses at once: POST /pause replies with held = paused, and the pause is saved", async () => {
    const { paths, fake } = await launch();
    const paused = await call(paths.socket, "POST", "/pause", { paused: true });
    assert.equal(paused.body.held, "paused");
    assert.equal(JSON.parse(readFileSync(paths.configFile, "utf8")).paused, true);
    const resumed = await call(paths.socket, "POST", "/pause", { paused: false });
    assert.equal(resumed.body.held, null);
    assert.deepEqual(
      fake!.calls.filter((c) => c.startsWith("held")),
      ["held null", "held paused", "held null"],
    );
  });

  it("passes the index hours' next start to the service", async () => {
    const { paths, fake } = await launch();
    const hour = new Date().getHours();
    // Hours that exclude now: from two hours ahead to three hours ahead.
    const start = (hour + 2) % 24;
    await call(paths.socket, "POST", "/config", { indexHours: { start, end: (hour + 3) % 24 } });
    assert.equal(fake!.held, "outside index hours");
    assert.equal(new Date(fake!.heldUntil!).getHours(), start);
  });

  it("answers mistakes with 400, 404 and 413, and failures with the service's status or 500", async () => {
    const { paths } = await launch({ maxBodyBytes: 1000 });
    const s = paths.socket;
    const cases: Array<[string, string, { raw?: string; body?: unknown }, number, RegExp]> = [
      ["POST", "/search", { raw: "{not json" }, 400, /isn't JSON/],
      ["POST", "/search", { body: [1, 2] }, 400, /JSON object/],
      ["POST", "/search", { body: { query: 5 } }, 400, /query must be text/],
      ["POST", "/pause", { body: {} }, 400, /paused must be true or false/],
      ["POST", "/config", { body: { folders: "/x" } }, 400, /folders must be a list/],
      ["POST", "/config", { body: { folders: ["relative"] } }, 400, /isn't a full path/],
      ["POST", "/segment-text", { body: { segmentId: 1.5, code: false } }, 400, /segmentId/],
      ["GET", "/nowhere", {}, 404, /no route GET \/nowhere/],
      ["GET", "/search", {}, 404, /no route GET \/search/],
      ["POST", "/status", { body: {} }, 404, /no route/],
      ["POST", "/thumb", { body: { path: "/gone", kind: "image" } }, 404, /no such file/],
      ["POST", "/thumb", { body: { path: "/boom", kind: "image" } }, 500, /the helper crashed/],
    ];
    for (const [method, path, payload, status, message] of cases) {
      const reply = await call(s, method, path, payload.body, { raw: payload.raw });
      assert.equal(reply.status, status, `${method} ${path} ${JSON.stringify(payload)}`);
      assert.match(reply.body.error, message);
    }
    // An empty POST body is {}.
    assert.equal((await call(s, "POST", "/sync")).status, 200);
  });

  it("refuses an oversized body with 413", async () => {
    const { paths } = await launch({ maxBodyBytes: 1000 });
    const big = JSON.stringify({ query: "x".repeat(5000) });
    try {
      const reply = await call(paths.socket, "POST", "/search", undefined, { raw: big });
      assert.equal(reply.status, 413);
      assert.match(reply.body.error, /over 1000 bytes/);
    } catch (error) {
      // The daemon may close the connection while the client still writes.
      assert.ok(["EPIPE", "ECONNRESET"].includes((error as NodeJS.ErrnoException).code ?? ""), String(error));
    }
    assert.equal((await call(paths.socket, "GET", "/status")).status, 200, "still serving");
  });

  it("aborts the service's work when the client goes away", async () => {
    const { paths, fake } = await launch();
    const controller = new AbortController();
    const pending = call(paths.socket, "POST", "/estimate", { folders: ["/slow"] }, { signal: controller.signal });
    await sleep(100);
    const signal = fake!.signals.at(-1)!;
    assert.equal(signal.aborted, false);
    controller.abort();
    await assert.rejects(pending, { name: "AbortError" });
    await sleep(50);
    assert.equal(signal.aborted, true);
    assert.ok(signal.reason instanceof HttpError);
    assert.equal((await call(paths.socket, "GET", "/status")).status, 200, "still serving");
  });

  it("notes a cancelled estimate in the log, but not a search typed over (one per keystroke)", async () => {
    const lines: string[] = [];
    const note = (line: string) => lines.push(line);
    const { paths } = await launch({ log: { info: note, warn: note, error: note } });
    for (const [path, body] of [
      ["/search", { query: "slow" }],
      ["/estimate", { folders: ["/slow"] }],
    ] as const) {
      const controller = new AbortController();
      const pending = call(paths.socket, "POST", path, body, { signal: controller.signal });
      await sleep(100);
      controller.abort();
      await assert.rejects(pending, { name: "AbortError" });
    }
    await sleep(50);
    assert.deepEqual(
      lines.filter((line) => line.includes("cancelled")),
      ["daemon: POST /estimate cancelled by the client"],
    );
  });

  it("refuses a thumbnail of an unknown kind", async () => {
    const { paths } = await launch();
    const reply = await call(paths.socket, "POST", "/thumb", { path: "/a.jpg", kind: "banana" });
    assert.equal(reply.status, 400);
    assert.match(reply.body.error, /^kind must be one of screenshot, image, pdf/);
  });
});

describe("stopping", () => {
  it("POST /quit replies, stops the service, and removes the socket, daemon.json and pid file", async () => {
    const { daemon, fake, paths } = await launch();
    const reply = await call(paths.socket, "POST", "/quit", {});
    assert.deepEqual(reply, { status: 200, body: {} });
    assert.equal(await daemon!.stopped, "quit");
    assert.ok(fake!.calls.includes("stop"));
    assert.equal(existsSync(paths.socket), false);
    assert.equal(existsSync(join(paths.support, DAEMON_INFO_FILE)), false);
    assert.equal(existsSync(paths.pidFile), false);
    assert.equal(existsSync(dirname(paths.socket)), false, "the empty socket folder goes too");
    assert.ok(existsSync(paths.configFile) === false, "settings untouched (none were saved)");
    // A new daemon can start at once.
    assert.ok((await launch({}, paths.support)).daemon);
  });

  it("finishes stopping when the service doesn't", async () => {
    const { daemon, fake, paths } = await launch({ stopTimeoutMs: 100 });
    fake!.stopForever = true;
    await call(paths.socket, "POST", "/quit", {});
    assert.equal(await daemon!.stopped, "quit");
    assert.equal(existsSync(paths.pidFile), false);
  });

  it("stops when its parent is gone", async () => {
    let gone = false;
    const { daemon } = await launch({ parentGone: () => gone, parentCheckMs: 20 });
    await sleep(60);
    gone = true;
    assert.equal(await daemon!.stopped, "parent exited");
  });

  it("leaves daemon.json alone when it belongs to another daemon", async () => {
    const { daemon, paths } = await launch();
    const other = { pid: 1, socket: "/elsewhere", apiVersion: API_VERSION, startedAt: 0 };
    writeFileSync(join(paths.support, DAEMON_INFO_FILE), JSON.stringify(other));
    await daemon!.stop("test");
    assert.deepEqual(infoOf(paths), other);
  });
});

describe("DIGUP_PORT_RANGE", () => {
  it("keeps llama-server to a range when one is given, else any free port", () => {
    assert.deepEqual(portRangeFrom("18900-18999"), [18900, 18999]);
    assert.deepEqual(portRangeFrom(" 20000-20000 "), [20000, 20000]);
    for (const text of [undefined, "", "18999-18900", "80-90", "18900-70000", "18900", "a-b"]) {
      assert.equal(portRangeFrom(text), null, String(text));
    }
  });
});

describe("the log", () => {
  it("is cut at the limit: copied to daemon.log.1 and emptied in place", () => {
    const dir = tempSupport();
    const file = join(dir, "logs", "daemon.log");
    const log = rotatingLog(file, 300);
    for (let i = 0; i < 10; i++) log.info(`line ${i} ${"x".repeat(40)}`);
    assert.ok(statSync(file).size <= 300);
    assert.ok(existsSync(`${file}.1`));
    assert.ok(statSync(`${file}.1`).size > 200);
    assert.match(readFileSync(file, "utf8"), /line 9/);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// As a process of its own (main's wiring: installProcessHandlers), with a fake service in a small script.

describe("the process", () => {
  function script(dir: string): string {
    const file = join(dir, "run-daemon.ts");
    const engine = join(PROJECT, "engine");
    writeFileSync(
      file,
      `import { installProcessHandlers, rotatingLog, startDaemon } from ${JSON.stringify(join(engine, "daemon"))};
import { makePaths } from ${JSON.stringify(join(engine, "paths"))};
const support = process.argv[2];
const paths = makePaths(support, support);
const log = rotatingLog(paths.logs + "/daemon.log");
const counts = { byKind: {}, total: { files: 0, done: 0, partial: 0, pending: 0, skipped: 0, failed: 0 }, vectors: 0, segments: 0, unfinished: { files: 0, units: 0 } };
const fake: any = {
  start() {}, async stop() { log.info("fake: stopped"); }, setConfig() {}, setHeld() {},
  status: () => ({ apiVersion: 0, pid: 0, setup: { state: "ready" }, activity: { state: "idle" }, held: null, main: counts, code: null, encoder: "off", lastError: null, folders: [], codeFolders: [] }),
  requestSync(index?: string) {
    if (index === undefined && process.env.FAIL === "reject") void Promise.reject(new Error("rejected on purpose"));
    if (index === undefined && process.env.FAIL === "throw") setTimeout(() => { throw new Error("thrown on purpose"); });
  },
};
void (async () => {
  const daemon = await startDaemon({ paths, log, makeService: () => fake, power: async () => ({ onBattery: false, lowPower: false, thermal: "nominal" }), watcher: { volumes: null } });
  if (!daemon) process.exit(0);
  installProcessHandlers(daemon, log);
})();
`,
    );
    return file;
  }

  async function runDaemon(env: Record<string, string> = {}) {
    const support = tempSupport();
    const paths = makePaths(support, support);
    const child = spawn("bash", ["scripts/run-node.sh", script(support), support], {
      cwd: PROJECT,
      env: { ...process.env, ...env },
      stdio: "ignore",
    });
    const exited = new Promise<number | null>((done) => child.once("exit", (code) => done(code)));
    for (let i = 0; i < 100 && !existsSync(join(support, DAEMON_INFO_FILE)); i++) await sleep(100);
    assert.ok(existsSync(join(support, DAEMON_INFO_FILE)), "the daemon started");
    return { child, exited, paths, log: () => readFileSync(join(paths.logs, "daemon.log"), "utf8") };
  }

  function kill(child: ChildProcess, signal: NodeJS.Signals) {
    if (child.exitCode === null) child.kill(signal);
  }

  it("stops cleanly on SIGTERM and exits 0", async () => {
    const { child, exited, paths, log } = await runDaemon();
    assert.equal(infoOf(paths).pid, child.pid, "run-node.sh execs node: the pid is the daemon's");
    kill(child, "SIGTERM");
    assert.equal(await exited, 0);
    assert.equal(existsSync(paths.socket), false);
    assert.equal(existsSync(paths.pidFile), false);
    assert.equal(existsSync(join(paths.support, DAEMON_INFO_FILE)), false);
    assert.match(log(), /fake: stopped/);
    assert.match(log(), /stopped \(SIGTERM\)/);
  });

  it("stops cleanly on SIGINT", async () => {
    const { child, exited, log } = await runDaemon();
    kill(child, "SIGINT");
    assert.equal(await exited, 0);
    assert.match(log(), /stopped \(SIGINT\)/);
  });

  it("logs an unhandled rejection and keeps serving", async () => {
    const { child, exited, paths, log } = await runDaemon({ FAIL: "reject" });
    assert.equal((await call(paths.socket, "POST", "/sync", {})).status, 200);
    await sleep(100);
    assert.equal((await call(paths.socket, "GET", "/status")).status, 200);
    assert.match(log(), /unhandled rejection: Error: rejected on purpose/);
    kill(child, "SIGTERM");
    assert.equal(await exited, 0);
  });

  it("survives an uncaught exception, but stops (exit 1) after five in a minute", async () => {
    const { child, exited, paths, log } = await runDaemon({ FAIL: "throw" });
    await call(paths.socket, "POST", "/sync", {});
    await sleep(100);
    assert.equal((await call(paths.socket, "GET", "/status")).status, 200, "one is survived");
    assert.match(log(), /uncaught exception: Error: thrown on purpose/);
    for (let i = 0; i < 4; i++) await call(paths.socket, "POST", "/sync", {}).catch(() => {});
    assert.equal(await exited, 1);
    assert.match(log(), /stopped \(errors\)/);
    assert.equal(existsSync(paths.pidFile), false);
    kill(child, "SIGKILL");
  });
});
