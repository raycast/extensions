import net from "node:net";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { getPreferenceValues } from "@raycast/api";

export const SOCKET_PATH = path.join(os.homedir(), ".config", "cliamp", "cliamp.sock");
export const PID_PATH = path.join(os.homedir(), ".config", "cliamp", "cliamp.sock.pid");

interface Preferences {
  cliampPath?: string;
  autoStart?: boolean;
}

export interface Track {
  title?: string;
  artist?: string;
  album?: string;
  path?: string;
  genre?: string;
  index?: number;
  stream?: boolean;
  realtime?: boolean;
  provider_meta?: Record<string, string>;
  [key: string]: unknown;
}

export interface Snapshot {
  revision: number;
  playlist_revision: number;
  state: "playing" | "paused" | "stopped";
  track?: Track;
  logical_track?: Track;
  position?: number;
  duration?: number;
  seekable?: boolean;
  total?: number;
  play_next_total?: number;
  shuffle?: boolean;
  repeat?: string;
  mono?: boolean;
  speed?: number;
  volume?: number;
  eq_preset?: string;
  eq_bands?: number[];
  visualizer?: string;
  stream_error?: string;
  [key: string]: unknown;
}

export interface Provider {
  key: string;
  name: string;
  searchable?: boolean;
  catalog?: boolean;
  browse_artists?: boolean;
}

export interface ProviderPlaylist {
  id: string;
  name: string;
  provider?: string;
  [key: string]: unknown;
}

type Frame = { version: number; id: string; ok?: boolean; [key: string]: unknown };

export class CliampNotRunningError extends Error {
  constructor() {
    super("cliamp is not running (no IPC socket)");
    this.name = "CliampNotRunningError";
  }
}

function prefs(): Required<Preferences> {
  const p = getPreferenceValues<Preferences>();
  return {
    cliampPath: p.cliampPath?.trim() || "/opt/homebrew/bin/cliamp",
    autoStart: p.autoStart ?? true,
  };
}

class Client {
  private buf = "";
  private pending = new Map<string, { resolve: (f: Frame) => void; reject: (e: Error) => void }>();

  private constructor(private sock: net.Socket) {
    sock.on("data", (chunk) => this.onData(chunk));
    sock.on("error", (err) => this.failAll(err));
    sock.on("close", () => this.failAll(new Error("cliamp closed the connection")));
  }

  static connect(timeoutMs = 2000): Promise<Client> {
    return new Promise((resolve, reject) => {
      const sock = net.createConnection(SOCKET_PATH);
      const timer = setTimeout(() => {
        sock.destroy();
        reject(new CliampNotRunningError());
      }, timeoutMs);
      sock.once("connect", () => {
        clearTimeout(timer);
        sock.removeAllListeners("error");
        resolve(new Client(sock));
      });
      sock.once("error", () => {
        clearTimeout(timer);
        sock.destroy();
        reject(new CliampNotRunningError());
      });
    });
  }

  private onData(chunk: Buffer) {
    this.buf += chunk.toString("utf8");
    let nl;
    while ((nl = this.buf.indexOf("\n")) >= 0) {
      const line = this.buf.slice(0, nl).trim();
      this.buf = this.buf.slice(nl + 1);
      if (!line) continue;
      let frame: Frame;
      try {
        frame = JSON.parse(line);
      } catch {
        continue;
      }
      const waiter = frame.id ? this.pending.get(frame.id) : undefined;
      if (waiter) {
        this.pending.delete(frame.id);
        waiter.resolve(frame);
      }
    }
  }

  private failAll(err: Error) {
    for (const { reject } of this.pending.values()) reject(err);
    this.pending.clear();
  }

  request(method: string, extra: Record<string, unknown> = {}, timeoutMs = 15000): Promise<Frame> {
    const id = randomUUID();
    const payload = JSON.stringify({ version: 2, id, method, ...extra }) + "\n";
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`cliamp did not answer ${method} in time`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (f) => {
          clearTimeout(timer);
          resolve(f);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });
      this.sock.write(payload);
    });
  }

  close() {
    this.sock.destroy();
  }
}

function frameError(frame: Frame): Error {
  const err = frame.error as { code?: string; message?: string; detail?: string } | string | undefined;
  if (typeof err === "string") return new Error(err);
  const msg = err?.message || err?.code || "cliamp request failed";
  return new Error(err?.detail ? `${msg}: ${err.detail}` : msg);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function daemonPid(): number | undefined {
  try {
    const pid = parseInt(fs.readFileSync(PID_PATH, "utf8").trim(), 10);
    if (!Number.isFinite(pid)) return undefined;
    process.kill(pid, 0);
    return pid;
  } catch {
    return undefined;
  }
}

export async function startDaemon(): Promise<void> {
  const { cliampPath } = prefs();
  const child = spawn(cliampPath, ["--daemon"], { detached: true, stdio: "ignore" });
  const spawnFailed = new Promise<never>((_, reject) => {
    child.once("error", (err: NodeJS.ErrnoException) => {
      reject(
        err.code === "ENOENT"
          ? new Error(
              `cliamp not found at ${cliampPath}. Install it with "brew install bjarneo/cliamp/cliamp" or set the binary path in this extension's preferences.`,
            )
          : err,
      );
    });
  });
  child.unref();
  for (let i = 0; i < 25; i++) {
    await Promise.race([sleep(200), spawnFailed]);
    try {
      const c = await Client.connect(500);
      c.close();
      return;
    } catch (e) {
      if (!(e instanceof CliampNotRunningError)) throw e;
      // keep waiting for the socket
    }
  }
  throw new Error(`Started ${cliampPath} --daemon but its socket never came up`);
}

async function connectMaybeStarting(): Promise<Client> {
  try {
    return await Client.connect();
  } catch (e) {
    if (e instanceof CliampNotRunningError && prefs().autoStart) {
      await startDaemon();
      return await Client.connect();
    }
    throw e;
  }
}

async function withClient<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const client = await connectMaybeStarting();
  try {
    return await fn(client);
  } finally {
    client.close();
  }
}

export async function getSnapshot(): Promise<Snapshot> {
  return withClient(async (c) => {
    const frame = await c.request("state.get");
    if (!frame.ok) throw frameError(frame);
    return frame.snapshot as Snapshot;
  });
}

interface Job {
  id: string;
  operation: string;
  state: "queued" | "running" | "succeeded" | "failed" | "canceled";
  result?: Record<string, unknown> & { ok?: boolean; error?: string };
  error?: { code?: string; message?: string; detail?: string } | string;
  snapshot?: Snapshot;
}

// Submit an operation and wait for its job to finish; returns job.result.
export async function callOp<T = Record<string, unknown>>(
  operation: string,
  params: Record<string, unknown> = {},
  timeoutMs = 20000,
): Promise<T> {
  return withClient(async (c) => {
    const submitted = await c.request("operation.submit", { operation, params });
    if (!submitted.ok) throw frameError(submitted);
    let job = submitted.job as Job;
    const deadline = Date.now() + timeoutMs;
    while (job.state === "queued" || job.state === "running") {
      if (Date.now() > deadline) throw new Error(`cliamp operation ${operation} timed out`);
      await sleep(100);
      const polled = await c.request("job.get", { job_id: job.id });
      if (!polled.ok) throw frameError(polled);
      job = polled.job as Job;
    }
    if (job.state !== "succeeded") {
      const err = job.error;
      const msg =
        typeof err === "string" ? err : err?.detail || err?.message || err?.code || `${operation} ${job.state}`;
      throw new Error(msg);
    }
    return (job.result ?? {}) as T;
  });
}

export async function listProviders(): Promise<Provider[]> {
  const res = await callOp<{ providers?: Provider[] }>("provider.list");
  return res.providers ?? [];
}

export function trackLabel(t?: Track): string {
  if (!t) return "Nothing loaded";
  const title = t.title || (t.path ? path.basename(String(t.path)) : "Unknown");
  return t.artist ? `${t.artist} — ${title}` : title;
}

export function fmtTime(seconds?: number): string {
  if (seconds === undefined || !Number.isFinite(seconds)) return "–:––";
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const ss = s % 60;
  return h > 0
    ? `${h}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
    : `${mm}:${String(ss).padStart(2, "0")}`;
}

export const EQ_PRESETS = [
  "Flat",
  "Rock",
  "Pop",
  "Jazz",
  "Classical",
  "Bass Boost",
  "Treble Boost",
  "Vocal",
  "Electronic",
  "Acoustic",
];

export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
