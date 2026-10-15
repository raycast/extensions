// The daemon process (DESIGN "Processes"): one per support folder, started detached by a Raycast command. It holds the
// lock, serves engine/api.ts as JSON over HTTP on a Unix socket, and wires the settings file, the folder watcher and
// the power policy to the Service, which does the work. Bundled to assets/daemon.js (scripts/build-daemon.mjs).

import {
  chmodSync,
  closeSync,
  copyFileSync,
  existsSync,
  fstatSync,
  ftruncateSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmdirSync,
  statSync,
  truncateSync,
  unlinkSync,
  writeFileSync,
  writeSync,
  constants as fsConstants,
  appendFileSync,
} from "node:fs";
import { type IncomingMessage, type Server, type ServerResponse, createServer } from "node:http";
import { connect } from "node:net";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  API_VERSION,
  DAEMON_INFO_FILE,
  type Config,
  type DaemonInfo,
  type EstimateRequest,
  type FileListItem,
  type FileListRequest,
  type FolderEstimate,
  type OpenMediaRequest,
  type OpenPdfRequest,
  type OpenResponse,
  type Routes,
  type SearchRequest,
  type SearchResponse,
  type Status,
  type ThumbRequest,
  type ThumbResponse,
} from "./api";
import { ConfigStore } from "./config";
import type { PowerStatus } from "./helper";
import type { Log } from "./log";
import { type Paths, makePaths } from "./paths";
import { Policy, type PolicyOptions, powerFromHelper } from "./policy";
import { Service } from "./service";
import { FILE_KINDS } from "./types";
import { type WatchProblem, Watcher, type WatcherOptions } from "./watcher";

// ---------------------------------------------------------------------------------------------------------------------
// The Service, as the daemon sees it (DESIGN "Engine module contracts"). Methods that can take long get the request's
// AbortSignal: a Service that declares fewer parameters still fits.

export interface ServiceOptions {
  paths: Paths;
  config: Config;
  log: Log;
}

export interface ServiceLike {
  start(): void;
  stop(): Promise<void>;
  requestSync(index?: "main" | "code"): void;
  /** Every change of the settings; the service sees what changed (folders: prune and sync). */
  setConfig(config: Config): void;
  /** From the policy (pause, hours, power); `until`: epoch ms when the index hours start again. */
  setHeld(reason: Status["held"], until?: number | null): void;
  status(): Status;
  search(request: SearchRequest, signal?: AbortSignal): Promise<SearchResponse>;
  prewarm(signal?: AbortSignal): Promise<Status["encoder"]>;
  setup(): Promise<void>;
  estimate(request: EstimateRequest, signal?: AbortSignal): Promise<FolderEstimate[]>;
  reindex(code: boolean): Promise<void>;
  thumb(request: ThumbRequest, signal?: AbortSignal): Promise<ThumbResponse>;
  files(request: FileListRequest): FileListItem[] | Promise<FileListItem[]>;
  suggestCodeFolders(): string[] | Promise<string[]>;
  segmentText(segmentId: number, code: boolean): string | null | Promise<string | null>;
  openPdf(request: OpenPdfRequest): Promise<OpenResponse>;
  openMedia(request: OpenMediaRequest): Promise<OpenResponse>;
  access(folders: string[], signal?: AbortSignal): Promise<{ folder: string; readable: boolean; error?: string }[]>;
  /** Optional: the folders the watcher can't watch (missing or unreadable), for Status (ui-contract C2). */
  watchProblems?(problems: WatchProblem[]): void;
}

// ---------------------------------------------------------------------------------------------------------------------
// The log: daemon.log, cut at about 5 MB. The client opened the same file for the daemon's stdout and stderr (with
// O_APPEND), so it is copied to daemon.log.1 and emptied in place rather than renamed: a crash trace still lands in
// daemon.log.

export const LOG_LIMIT = 5 * 1024 * 1024;

export function rotatingLog(file: string, maxBytes = LOG_LIMIT, echo = false): Log {
  try {
    mkdirSync(dirname(file), { recursive: true });
  } catch {
    // the first write reports nothing either: logging never takes the daemon down
  }
  const sizeNow = () => statSync(file, { throwIfNoEntry: false })?.size ?? 0;
  let size = sizeNow();
  const write = (level: string, message: string) => {
    const line = `${new Date().toISOString()} ${level} ${message}\n`;
    try {
      const bytes = Buffer.byteLength(line);
      // Others write here too (stderr): look at the real size only when the count says it may be time.
      if (size + bytes > maxBytes && (size = sizeNow()) + bytes > maxBytes) {
        copyFileSync(file, `${file}.1`);
        truncateSync(file, 0);
        size = 0;
      }
      appendFileSync(file, line);
      size += bytes;
    } catch {
      // as fileLog: never throw
    }
    if (echo) process.stderr.write(line);
  };
  return {
    info: (m) => write("info", m),
    warn: (m) => write("warn", m),
    error: (m) => write("error", m),
  };
}

function describe(error: unknown): string {
  return error instanceof Error ? (error.stack ?? error.message) : String(error);
}

// ---------------------------------------------------------------------------------------------------------------------
// Single instance: <support>/daemon.pid, locked with an flock taken by open(2) itself (O_EXLOCK). The kernel lets go of
// it when the process dies, however it dies, so a pid file left by a crash is free to take over.

/** <fcntl.h> O_EXLOCK; Node doesn't export it, but passes open flags through. */
const O_EXLOCK = 0x20;

type Lock = { fd: number; file: string } | "held";

function takeLock(file: string): Lock {
  mkdirSync(dirname(file), { recursive: true });
  const { O_RDWR, O_CREAT, O_NONBLOCK } = fsConstants;
  for (let attempt = 0; attempt < 5; attempt++) {
    let fd: number;
    try {
      fd = openSync(file, O_RDWR | O_CREAT | O_NONBLOCK | O_EXLOCK, 0o644);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "EAGAIN" || code === "EWOULDBLOCK") return "held";
      if (code === "EOPNOTSUPP" || code === "ENOTSUP") return pidLock(file);
      throw error;
    }
    // A daemon that quit may have unlinked the file between our open and our lock: a lock on that file guards nothing.
    const now = statSync(file, { throwIfNoEntry: false });
    const mine = fstatSync(fd);
    if (now && now.ino === mine.ino && now.dev === mine.dev) {
      ftruncateSync(fd, 0);
      writeSync(fd, `${process.pid}\n`, 0);
      return { fd, file };
    }
    closeSync(fd);
  }
  return "held";
}

/** For a file system without flock: the pid in the file decides (racy, but only there). */
function pidLock(file: string): Lock {
  const pid = Number.parseInt(readFileSync(file, { encoding: "utf8", flag: "a+" }).trim(), 10);
  if (Number.isInteger(pid) && pid > 0 && pid !== process.pid && alive(pid)) return "held";
  writeFileSync(file, `${process.pid}\n`);
  return { fd: openSync(file, "r"), file };
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

/** The pid file goes before the lock does: a daemon starting meanwhile makes a new file and locks that one. */
function releaseLock(lock: { fd: number; file: string }): void {
  try {
    const now = statSync(lock.file, { throwIfNoEntry: false });
    const mine = fstatSync(lock.fd);
    if (now && now.ino === mine.ino && now.dev === mine.dev) unlinkSync(lock.file);
  } catch {
    // gone already
  }
  try {
    closeSync(lock.fd);
  } catch {
    // closed already
  }
}

/** Whether something accepts connections on the socket. */
function answers(socket: string, timeoutMs = 1000): Promise<boolean> {
  return new Promise((done) => {
    const connection = connect({ path: socket });
    const finish = (yes: boolean) => {
      connection.destroy();
      done(yes);
    };
    connection.setTimeout(timeoutMs, () => finish(false));
    connection.once("connect", () => finish(true));
    connection.once("error", () => finish(false));
  });
}

/**
 * /tmp/digup-<uid>-<hash>/: made with mode 0700, and refused when it is a link or someone else's. /tmp is shared, and
 * this socket is the one new way into the user's files this port adds (PARITY P-232).
 */
function prepareSocketFolder(socket: string): void {
  const folder = dirname(socket);
  try {
    mkdirSync(folder, { mode: 0o700 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  const info = lstatSync(folder);
  if (info.isSymbolicLink() || !info.isDirectory()) throw new Error(`${folder} isn't a folder; not listening there`);
  if (info.uid !== process.getuid?.()) throw new Error(`${folder} belongs to another user; not listening there`);
  // mkdir's mode passes through the umask, and an older folder may have other bits.
  if ((info.mode & 0o777) !== 0o700) chmodSync(folder, 0o700);
}

function writeAtomically(file: string, text: string): void {
  const temporary = `${file}.${process.pid}.tmp`;
  writeFileSync(temporary, text, { mode: 0o644 });
  renameSync(temporary, file);
}

// ---------------------------------------------------------------------------------------------------------------------
// HTTP

/** A request the daemon refuses, with its status. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

const MAX_BODY_BYTES = 1024 * 1024;
const ROUTINE_ABORTS: ReadonlySet<string> = new Set(["POST /search", "POST /thumb"]);

function readBody(request: IncomingMessage, limit: number): Promise<unknown> {
  return new Promise((done, fail) => {
    const declared = Number(request.headers["content-length"]);
    if (Number.isFinite(declared) && declared > limit) {
      fail(new HttpError(413, `the request is over ${limit} bytes`));
      return;
    }
    const chunks: Buffer[] = [];
    let total = 0;
    let over = false;
    request.on("data", (chunk: Buffer) => {
      if (over) return;
      total += chunk.length;
      if (total > limit) {
        over = true;
        fail(new HttpError(413, `the request is over ${limit} bytes`));
        return;
      }
      chunks.push(chunk);
    });
    request.on("error", fail);
    request.on("end", () => {
      if (over) return;
      const text = Buffer.concat(chunks).toString("utf8");
      if (text.trim() === "") return done(undefined);
      try {
        done(JSON.parse(text));
      } catch (error) {
        fail(new HttpError(400, `the request isn't JSON: ${(error as Error).message}`));
      }
    });
  });
}

function send(response: ServerResponse, status: number, value: unknown, close = false): void {
  if (response.headersSent || response.destroyed) return;
  const text = JSON.stringify(value === undefined ? {} : value);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(text),
    ...(close ? { connection: "close" } : {}),
  });
  response.end(text);
}

/** The status an error asks for (HttpError, ConfigError, or a service error with `status`), else 500. */
function statusOf(error: unknown): number {
  const status =
    (error as { status?: unknown; statusCode?: unknown } | null)?.status ??
    (error as { statusCode?: unknown } | null)?.statusCode;
  return typeof status === "number" && Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500;
}

// Light checks of request bodies, so a malformed one is a 400 and not a crash deep in the service.

type Body = Record<string, unknown>;
const isString = (v: unknown) => typeof v === "string";
const isStrings = (v: unknown) => Array.isArray(v) && v.every(isString);
const isNumber = (v: unknown) => typeof v === "number" && Number.isFinite(v);

function need(body: Body, name: string, test: (v: unknown) => boolean, what: string, optional = false) {
  const value = body[name];
  if ((optional && (value === undefined || value === null)) || test(value)) return;
  throw new HttpError(400, `${name} must be ${what}`);
}

const CHECKS: Partial<Record<keyof Routes, (body: Body) => void>> = {
  "POST /search": (b) => {
    need(b, "query", isString, "text");
    need(b, "kinds", isStrings, "a list of kinds", true);
    need(b, "limit", isNumber, "a number", true);
  },
  "POST /pause": (b) => need(b, "paused", (v) => typeof v === "boolean", "true or false"),
  "POST /estimate": (b) => need(b, "folders", isStrings, "a list of paths"),
  "POST /reindex": (b) => need(b, "code", (v) => typeof v === "boolean", "true or false", true),
  "POST /thumb": (b) => {
    need(b, "path", isString, "a path");
    need(b, "kind", (v) => (FILE_KINDS as readonly unknown[]).includes(v), `one of ${FILE_KINDS.join(", ")}`);
  },
  "POST /files": (b) => {
    need(b, "states", isStrings, "a list of states", true);
    need(b, "kinds", isStrings, "a list of kinds", true);
  },
  "POST /segment-text": (b) => {
    need(b, "segmentId", Number.isInteger, "a whole number");
    need(b, "code", (v) => typeof v === "boolean", "true or false", true);
  },
  "POST /open-pdf": (b) => {
    need(b, "path", isString, "a path");
    need(b, "page", isNumber, "a number");
    need(b, "words", isStrings, "a list of words", true);
  },
  "POST /open-media": (b) => {
    need(b, "path", isString, "a path");
    need(b, "seconds", isNumber, "a number");
    need(b, "player", isString, "a bundle id or null", true);
  },
  "POST /access": (b) => need(b, "folders", isStrings, "a list of paths"),
};

/** Route → handler. The mapped type makes a route added to api.ts fail the type check here until it has its line. */
type Handler<K extends keyof Routes> = (
  body: Routes[K]["req"],
  signal: AbortSignal,
) => Routes[K]["res"] | Promise<Routes[K]["res"]>;
export type RouteTable = { [K in keyof Routes]: Handler<K> };

// ---------------------------------------------------------------------------------------------------------------------
// The daemon

export interface DaemonOptions {
  paths: Paths;
  makeService: (o: ServiceOptions) => ServiceLike;
  log: Log;
  /** The power state for the policy; default: the helper's `power` op. */
  power?: () => Promise<PowerStatus>;
  policy?: Pick<PolicyOptions, "intervalMs" | "heartbeatMs" | "wakeGapMs" | "firstReadMs">;
  watcher?: Omit<WatcherOptions, "log" | "onSync" | "onProblems">;
  /** True once the daemon should go (main: reparented to launchd, which can lose Raycast's file access). */
  parentGone?: () => boolean;
  parentCheckMs?: number;
  maxBodyBytes?: number;
  /** A stop waits this long for the service. */
  stopTimeoutMs?: number;
  /** Epoch ms; the client replaces a daemon started before daemon.js was last built. */
  startedAt?: number;
  /** A daemon that is starting or stopping holds the lock for a while: wait this long for it before giving up. A
   *  daemon that answers on the socket ends the wait at once. */
  lockWaitMs?: number;
}

/** A stop waits this long for the service, then 2 s for connections. The client gives a new daemon 15 s to answer, and
 *  a new daemon waits for a stopping one's lock: the two waits fit inside the client's. */
const STOP_TIMEOUT_MS = 8000;
const LOCK_WAIT_MS = 12_000;

/** "quit" (POST /quit), a signal name, "parent exited", or "errors" (state that can't be trusted). */
export type StopReason = string;

export interface Daemon {
  readonly info: DaemonInfo;
  readonly service: ServiceLike;
  readonly config: ConfigStore;
  /** Resolves with the reason once everything is stopped and cleaned up. */
  readonly stopped: Promise<StopReason>;
  stop(reason: StopReason): Promise<void>;
}

function delay(ms: number): Promise<void> {
  return new Promise((done) => setTimeout(done, ms));
}

/** Resolves with the promise's value, or with undefined after `ms` (then `late` is called). */
async function within<T>(promise: Promise<T>, ms: number, late: () => void): Promise<T | undefined> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<undefined>((done) => {
        timer = setTimeout(() => {
          late();
          done(undefined);
        }, ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Starts the daemon: lock, settings, service, policy, watcher, socket, then daemon.json (only once listening). Resolves
 * null when another daemon holds the lock. Process-wide wiring (signals, exit, process.title) is main's.
 */
export async function startDaemon(o: DaemonOptions): Promise<Daemon | null> {
  const { paths, log } = o;
  const startedAt = o.startedAt ?? Date.now();

  let lock = takeLock(paths.pidFile);
  for (const deadline = Date.now() + (o.lockWaitMs ?? LOCK_WAIT_MS); lock === "held"; lock = takeLock(paths.pidFile)) {
    if ((await answers(paths.socket)) || Date.now() >= deadline) {
      log.info("daemon: another daemon is running");
      return null;
    }
    await delay(100);
  }
  const held = lock;
  const infoFile = join(paths.support, DAEMON_INFO_FILE);
  // With the lock held no other daemon runs: a daemon.json still here was left by one that died (kill -9, a crash, power
  // loss). Its pid may belong to another program by now; clients must not take that for a daemon.
  try {
    unlinkSync(infoFile);
  } catch {
    // none
  }

  let service: ServiceLike | null = null;
  let policy: Policy | null = null;
  let watcher: Watcher | null = null;
  let server: Server | null = null;
  let parentTimer: NodeJS.Timeout | null = null;
  try {
    prepareSocketFolder(paths.socket);
    if (existsSync(paths.socket)) {
      if (await answers(paths.socket)) {
        // Only a daemon without our lock could be there (another support folder with the same hash).
        log.warn(`daemon: something already answers on ${paths.socket}`);
        releaseLock(held);
        return null;
      }
      unlinkSync(paths.socket);
    }

    const config = new ConfigStore(paths.configFile, log);
    const svc = o.makeService({ paths, config: config.get(), log });
    service = svc;
    const pol = new Policy(config.get(), {
      ...o.policy,
      log,
      power: o.power ?? powerFromHelper(paths.helperBin, log),
      onHeld: (reason, until) => svc.setHeld(reason, until),
    });
    policy = pol;
    // A pause kept from before (Config.paused persists) holds the first sync too.
    await pol.start();
    const watch = new Watcher({
      ...o.watcher,
      log,
      onSync: (index) => svc.requestSync(index),
      onProblems: (problems) => svc.watchProblems?.(problems),
    });
    watcher = watch;
    watch.update(config.get());
    // Three listeners, so one that throws doesn't keep the others from hearing the change.
    config.onChange((next) => svc.setConfig(next));
    config.onChange((next, _previous, changed) => {
      if (changed.has("paused") || changed.has("indexHours") || changed.has("indexOnBattery")) pol.update(next);
    });
    config.onChange((next, _previous, changed) => {
      if (["folders", "skipped", "codeFolders", "codeQuietSeconds"].some((key) => changed.has(key as keyof Config))) {
        watch.update(next);
      }
    });

    let stopping: Promise<void> | null = null;
    let resolveStopped!: (reason: StopReason) => void;
    const stopped = new Promise<StopReason>((done) => (resolveStopped = done));
    const info: DaemonInfo = { pid: process.pid, socket: paths.socket, apiVersion: API_VERSION, startedAt };

    const status = (): Status => ({ ...svc.status(), apiVersion: API_VERSION, pid: process.pid });
    const table: RouteTable = {
      "GET /status": () => status(),
      "POST /search": (r, signal) => svc.search(r, signal),
      "POST /prewarm": async (_r, signal) => ({ encoder: await svc.prewarm(signal) }),
      "POST /sync": () => {
        svc.requestSync();
        return {};
      },
      "POST /pause": (r) => {
        config.update({ paused: r.paused });
        return status();
      },
      "GET /config": () => config.get(),
      "POST /config": (r) => config.update(r ?? {}).config,
      "POST /estimate": (r, signal) => svc.estimate(r, signal),
      "POST /setup": () => {
        // It downloads for minutes; progress shows in Status.setup.
        void Promise.resolve()
          .then(() => svc.setup())
          .catch((error) => log.error(`setup: ${describe(error)}`));
        return status();
      },
      "POST /reindex": async (r) => {
        await svc.reindex(r.code === true);
        return {};
      },
      "POST /thumb": (r, signal) => svc.thumb(r, signal),
      "POST /files": (r) => svc.files(r),
      "POST /suggest-code-folders": () => svc.suggestCodeFolders(),
      "POST /segment-text": async (r) => ({ text: await svc.segmentText(r.segmentId, r.code === true) }),
      "POST /open-pdf": (r) => svc.openPdf(r),
      "POST /open-media": (r) => svc.openMedia(r),
      "POST /access": (r, signal) => svc.access(r.folders, signal),
      // The stop itself starts once this reply is out (handle).
      "POST /quit": () => ({}),
    };
    const maxBody = o.maxBodyBytes ?? MAX_BODY_BYTES;

    const handle = async (request: IncomingMessage, response: ServerResponse) => {
      const path = new URL(request.url ?? "/", "http://daemon").pathname;
      const key = `${request.method} ${path}`;
      const handler = Object.hasOwn(table, key)
        ? (table[key as keyof Routes] as unknown as (body: unknown, signal: AbortSignal) => unknown)
        : null;
      // A client that goes away (the add picker changed its folders, a search was typed over) stops the work.
      const controller = new AbortController();
      response.on("close", () => {
        if (!response.writableFinished) controller.abort(new HttpError(499, "the client went away"));
      });
      try {
        if (!handler) {
          request.resume();
          throw new HttpError(404, `no route ${key}`);
        }
        if (stopping) {
          request.resume();
          throw new HttpError(503, "Dig Up is stopping");
        }
        let body = await readBody(request, maxBody);
        if (request.method === "POST") {
          body ??= {};
          if (typeof body !== "object" || body === null || Array.isArray(body)) {
            throw new HttpError(400, "the request must be a JSON object");
          }
          CHECKS[key as keyof Routes]?.(body as Body);
        }
        const result = await handler(body, controller.signal);
        if (controller.signal.aborted) return;
        send(response, 200, result);
        if (key === "POST /quit") {
          // After the reply is out: stopping closes the connections.
          if (response.writableFinished) void stop("quit");
          else response.once("finish", () => void stop("quit"));
        }
      } catch (error) {
        if (controller.signal.aborted) {
          // A search typed over or a preview arrowed past is routine (one per keystroke): only other routes are noted.
          if (!ROUTINE_ABORTS.has(key)) log.info(`daemon: ${key} cancelled by the client`);
          return;
        }
        const code = statusOf(error);
        if (code >= 500) log.error(`daemon: ${key} failed: ${describe(error)}`);
        send(response, code, { error: error instanceof Error ? error.message : String(error) }, code === 413);
        // Don't read the rest of an oversized body.
        if (code === 413) response.once("finish", () => request.destroy());
      }
    };

    const srv = createServer((request, response) => void handle(request, response));
    server = srv;

    const stop = (reason: StopReason): Promise<void> => {
      stopping ??= (async () => {
        log.info(`daemon: stopping (${reason})`);
        if (parentTimer) clearInterval(parentTimer);
        // daemon.json first: a client that reads it now starts a new daemon, which waits for the lock.
        try {
          const recorded = JSON.parse(readFileSync(infoFile, "utf8")) as DaemonInfo;
          if (recorded.pid === process.pid) unlinkSync(infoFile);
        } catch {
          // not there, or not ours
        }
        const closed = new Promise<void>((done) => srv.close(() => done()));
        srv.closeIdleConnections();
        watch.stop();
        pol.stop();
        const timeout = o.stopTimeoutMs ?? STOP_TIMEOUT_MS;
        try {
          await within(svc.stop(), timeout, () => log.error(`daemon: the service didn't stop in ${timeout / 1000} s`));
        } catch (error) {
          log.error(`daemon: the service failed to stop: ${describe(error)}`);
        }
        srv.closeAllConnections();
        await within(closed, 2000, () => log.warn("daemon: connections didn't close"));
        try {
          if (lstatSync(paths.socket).isSocket()) unlinkSync(paths.socket);
        } catch {
          // closing the server removed it
        }
        releaseLock(held);
        try {
          rmdirSync(dirname(paths.socket));
        } catch {
          // not empty, or gone
        }
        log.info(`daemon: stopped (${reason})`);
        resolveStopped(reason);
      })();
      return stopping;
    };

    await new Promise<void>((done, fail) => {
      srv.once("error", fail);
      srv.listen(paths.socket, () => {
        srv.off("error", fail);
        done();
      });
    });
    chmodSync(paths.socket, 0o600);
    // A server that stops listening on its own can't be served from again.
    srv.on("error", (error) => {
      log.error(`daemon: the server failed: ${describe(error)}`);
      void stop("errors");
    });

    writeAtomically(infoFile, JSON.stringify(info) + "\n");
    log.info(`daemon: listening on ${paths.socket} (pid ${process.pid}, api ${API_VERSION})`);
    // Once it answers: opening the index can wait on another process's lock, and a client waiting for a daemon to
    // start would otherwise see none.
    svc.start();

    if (o.parentGone) {
      const gone = o.parentGone;
      parentTimer = setInterval(() => {
        if (gone()) void stop("parent exited");
      }, o.parentCheckMs ?? 5000);
      parentTimer.unref();
    }

    return { info, service: svc, config, stopped, stop };
  } catch (error) {
    // Undo what started, then let main report it.
    if (parentTimer) clearInterval(parentTimer);
    watcher?.stop();
    policy?.stop();
    if (service) await service.stop().catch(() => {});
    if (server?.listening) await new Promise<void>((done) => server!.close(() => done()));
    releaseLock(held);
    throw error;
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// The process

/**
 * Signals stop the daemon gracefully (a second one exits at once); unhandled errors are logged and the daemon keeps
 * serving, unless they come in a burst (5 in a minute), when its state can't be trusted. Exits once the daemon stopped.
 */
export function installProcessHandlers(
  daemon: Daemon,
  log: Log,
  exit: (code: number) => void = (code) => process.exit(code),
): void {
  let signalled = false;
  const onSignal = (signal: NodeJS.Signals) => {
    if (signalled) {
      log.warn(`daemon: ${signal} again; exiting now`);
      exit(1);
      return;
    }
    signalled = true;
    void daemon.stop(signal);
  };
  process.on("SIGTERM", onSignal);
  process.on("SIGINT", onSignal);
  process.on("unhandledRejection", (reason) => log.error(`daemon: unhandled rejection: ${describe(reason)}`));
  const recent: number[] = [];
  process.on("uncaughtException", (error) => {
    log.error(`daemon: uncaught exception: ${describe(error)}`);
    const now = Date.now();
    recent.push(now);
    while (recent.length > 0 && recent[0] < now - 60_000) recent.shift();
    if (recent.length >= 5) void daemon.stop("errors");
  });
  void daemon.stopped.then((reason) => exit(reason === "errors" ? 1 : 0));
}

/** DIGUP_PORT_RANGE="18900-18999": the ports llama-server may use (tests keep it in a known range); else any free one. */
export function portRangeFrom(text: string | undefined): [number, number] | null {
  const match = text?.trim().match(/^(\d{1,5})-(\d{1,5})$/);
  if (!match) return null;
  const [low, high] = [Number(match[1]), Number(match[2])];
  return low >= 1024 && low <= high && high <= 65535 ? [low, high] : null;
}

export async function main(argv: string[]): Promise<void> {
  const { values } = parseArgs({
    args: argv,
    options: { support: { type: "string" }, assets: { type: "string" } },
    strict: false,
  });
  if (typeof values.support !== "string" || typeof values.assets !== "string") {
    process.stderr.write("usage: daemon.js --support <folder> --assets <folder>\n");
    process.exit(2);
  }
  process.title = "dig-up-daemon";
  const paths = makePaths(resolve(values.support), resolve(values.assets));
  // stderr goes to daemon.log already (the client opened it for us); echo only in a terminal.
  const log = rotatingLog(join(paths.logs, "daemon.log"), LOG_LIMIT, process.stderr.isTTY === true);
  log.info(`daemon: starting (pid ${process.pid}, node ${process.version})`);
  const portRange = portRangeFrom(process.env.DIGUP_PORT_RANGE);
  if (portRange) log.info(`daemon: llama-server ports ${portRange[0]}-${portRange[1]}`);
  let daemon: Daemon | null;
  try {
    daemon = await startDaemon({
      paths,
      log,
      makeService: (options) => new Service({ ...options, deps: portRange ? { portRange } : undefined }),
      parentGone: () => process.ppid === 1,
      startedAt: Math.round(performance.timeOrigin),
    });
  } catch (error) {
    log.error(`daemon: can't start: ${describe(error)}`);
    process.exit(1);
  }
  if (!daemon) process.exit(0);
  installProcessHandlers(daemon, log);
}

if (require.main === module) void main(process.argv.slice(2));
