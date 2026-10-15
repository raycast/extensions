// Talks to the Dig Up daemon over its Unix socket, starting it when needed. Commands use only `api()`.

import { Toast, environment, getPreferenceValues, showToast } from "@raycast/api";
import { spawn } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, statSync } from "node:fs";
import { request } from "node:http";
import { join } from "node:path";
import { API_VERSION, DAEMON_INFO_FILE, type Config, type DaemonInfo, type Routes } from "../../engine/api";
import { isOurDaemon } from "./daemon-files";

export class DaemonError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

const support = environment.supportPath;
const daemonJs = join(environment.assetsPath, "daemon.js");

function readInfo(): DaemonInfo | null {
  try {
    return JSON.parse(readFileSync(join(support, DAEMON_INFO_FILE), "utf8")) as DaemonInfo;
  } catch {
    return null;
  }
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

/** Errors that say nothing listens on the socket any more (as opposed to a daemon that's slow to answer). */
const GONE = new Set(["ENOENT", "ECONNREFUSED", "ECONNRESET", "EPIPE", "ENOTSOCK"]);
const isGone = (error: unknown) => GONE.has((error as { code?: string } | null)?.code ?? "");

function send<T>(socket: string, method: string, path: string, body: unknown, timeoutMs: number, signal?: AbortSignal) {
  return new Promise<T>((resolve, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const req = request(
      {
        socketPath: socket,
        method,
        path,
        headers: payload ? { "content-type": "application/json", "content-length": Buffer.byteLength(payload) } : {},
        timeout: timeoutMs,
        signal,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let parsed: unknown = null;
          try {
            parsed = text ? JSON.parse(text) : null;
          } catch {
            // fall through: non-JSON reply
          }
          if ((res.statusCode ?? 500) >= 400) {
            const message = (parsed as { error?: string } | null)?.error ?? (text || `HTTP ${res.statusCode}`);
            reject(new DaemonError(message, res.statusCode));
          } else {
            resolve(parsed as T);
          }
        });
      },
    );
    req.on("timeout", () => req.destroy(new DaemonError(`Dig Up didn't answer within ${timeoutMs / 1000} s`)));
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

/** A daemon busy with a long step (a big index's first sync, emptying it after a model change) can take seconds to
 *  answer: that's no reason to replace it. */
const STATUS_WAIT_MS = 15_000;

type Found =
  /** It answers, and is the current build. */
  | "ok"
  /** It took the connection but didn't answer in time: it's working, so it's left alone. */
  | "busy"
  /** It answered that it's stopping. */
  | "stopping"
  /** It answered, but is an older build (another API, or daemon.js was rebuilt since it started). */
  | "outdated"
  /** Nothing answers: no daemon.json, its process is gone, or its socket is. */
  | "gone";

async function check(info: DaemonInfo | null): Promise<Found> {
  if (!info || !alive(info.pid)) return "gone";
  try {
    const status = await send<{ apiVersion: number } | null>(info.socket, "GET", "/status", undefined, STATUS_WAIT_MS);
    if (status?.apiVersion !== API_VERSION) return "outdated";
    // A rebuilt daemon.js (an update, or `npm run dev`) replaces a daemon started from the old one.
    if (existsSync(daemonJs) && statSync(daemonJs).mtimeMs > info.startedAt) return "outdated";
    return "ok";
  } catch (error) {
    if (isGone(error)) return "gone";
    if (error instanceof DaemonError && error.status === 503) return "stopping";
    if (error instanceof DaemonError && error.status !== undefined) return "outdated";
    return "busy";
  }
}

/** Ends an old daemon: asks it to quit (`ask`), waits for it, and only then signals it, if it's still ours. */
async function stop(info: DaemonInfo, ask: boolean) {
  if (ask) {
    try {
      await send(info.socket, "POST", "/quit", {}, 5000);
    } catch {
      // it may already be on its way out
    }
  }
  // A daemon stops its service (up to 8 s) and closes its connections (2 s) before it exits.
  for (let i = 0; i < 120 && alive(info.pid); i++) await sleep(100);
  if (alive(info.pid) && isOurDaemon(info, daemonJs)) {
    try {
      process.kill(info.pid, "SIGTERM");
    } catch {
      // gone
    }
  }
}

function start() {
  if (!existsSync(daemonJs)) throw new DaemonError(`Dig Up's engine is missing (${daemonJs}); rebuild the extension`);
  mkdirSync(join(support, "logs"), { recursive: true });
  const log = openSync(join(support, "logs", "daemon.log"), "a");
  try {
    const child = spawn(process.execPath, [daemonJs, "--support", support, "--assets", environment.assetsPath], {
      detached: true,
      // A file, never a pipe: a pipe to a command that has ended would block the daemon.
      stdio: ["ignore", log, log],
      env: {
        ...process.env,
        NODE_NO_WARNINGS: "1",
        PATH: ["/opt/homebrew/bin", "/usr/local/bin", process.env.PATH ?? "/usr/bin:/bin:/usr/sbin:/sbin"].join(":"),
      },
    });
    child.unref();
  } finally {
    closeSync(log);
  }
}

let ready: Promise<DaemonInfo> | null = null;

/**
 * Starts the daemon unless a current one is running, and resolves with where it listens. A daemon is replaced only
 * when it says it's an older build, or when nothing answers on its socket; a slow one is waited for, never killed.
 */
export function ensureDaemon(): Promise<DaemonInfo> {
  if (process.platform !== "darwin" || process.arch !== "arm64") {
    return Promise.reject(
      new DaemonError("Dig Up requires an Apple Silicon Mac (M1 or later) with macOS 14 or later."),
    );
  }
  ready ??= (async () => {
    const existing = readInfo();
    const found = await check(existing);
    if (existing && (found === "ok" || found === "busy")) return existing;
    if (existing && found === "outdated") await stop(existing, true);
    if (existing && found === "stopping") await stop(existing, false);
    // A daemon whose socket is gone (removed from /tmp) can't be asked: it's ended if it's ours. A pid that isn't
    // ours is another program's now: the new daemon replaces the stale daemon.json.
    if (existing && found === "gone" && alive(existing.pid) && isOurDaemon(existing, daemonJs)) {
      try {
        process.kill(existing.pid, "SIGTERM");
      } catch {
        // it ended between the check and the signal
      }
    }
    start();
    // A new daemon waits up to 12 s for an old one's lock, then opens its index.
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      await sleep(150);
      const info = readInfo();
      if (info && info.pid !== existing?.pid) {
        const now = await check(info);
        if (now === "ok" || now === "busy") return info;
      }
    }
    throw new DaemonError("Dig Up's engine didn't start; see its log in the extension's support folder");
  })().catch((error) => {
    ready = null;
    throw error;
  });
  return ready;
}

/** Calls a daemon route, starting the daemon first if needed. */
export async function api<K extends keyof Routes>(
  route: K,
  body?: Routes[K]["req"],
  options: { timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<Routes[K]["res"]> {
  const info = await ensureDaemon();
  const [method, path] = (route as string).split(" ");
  try {
    return await send<Routes[K]["res"]>(
      info.socket,
      method,
      path,
      body ?? undefined,
      options.timeoutMs ?? 30_000,
      options.signal,
    );
  } catch (error) {
    // The daemon may have exited between calls (Raycast restarted, an update): start it once more.
    if (error instanceof DaemonError || options.signal?.aborted) throw error;
    ready = null;
    const again = await ensureDaemon();
    return send<Routes[K]["res"]>(
      again.socket,
      method,
      path,
      body ?? undefined,
      options.timeoutMs ?? 30_000,
      options.signal,
    );
  }
}

/** One end of the hours: "22", "7", "22:00", "07:00", "10pm", "7 am" → the hour (0-24), or null. */
function hourOf(digits: string, minutes: string | undefined, half: string | undefined): number | null {
  if (minutes !== undefined && Number(minutes) !== 0) return null; // whole hours only, as DigUp's picker
  const hour = Number(digits);
  if (half === undefined) return hour <= 24 ? hour : null;
  if (hour < 1 || hour > 12) return null;
  return (hour % 12) + (half.toLowerCase() === "pm" ? 12 : 0);
}

/** "22-7", "22:00-07:00", "10pm-7am", "22 to 7" → {start: 22, end: 7}; empty or unreadable → null (any time). */
export function parseHours(text: string | undefined): Config["indexHours"] {
  const end = String.raw`(\d{1,2})(?::(\d{2}))?\s*([ap]m)?`;
  const match = text?.trim().match(new RegExp(`^${end}\\s*(?:[-–—]|to)\\s*${end}$`, "i"));
  if (!match) return null;
  const start = hourOf(match[1], match[2], match[3]);
  const until = hourOf(match[4], match[5], match[6]);
  if (start === null || until === null || start > 23 || start === until % 24) return null;
  return { start, end: until % 24 };
}

/** Sends the extension preferences the daemon needs (it owns the rest of the settings). Index Hours it can't read
 *  mean any time, and say so. */
export async function pushPreferences(): Promise<Config> {
  const prefs = getPreferenceValues<Preferences>();
  const hours = parseHours(prefs.indexHours);
  if (hours === null && prefs.indexHours?.trim()) {
    showToast({
      style: Toast.Style.Failure,
      title: `Can't read the Index Hours “${prefs.indexHours.trim()}”`,
      message: "Write them like 22-7 or 10pm-7am. Until then Dig Up indexes at any time.",
    }).catch(() => undefined);
  }
  return api("POST /config", {
    indexOnBattery: prefs.indexOnBattery ?? true,
    indexHours: hours,
    llamaServerPath: prefs.llamaServerPath || null,
    modelFolder: prefs.modelFolder || null,
  });
}
