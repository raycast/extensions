import { getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { connect } from "node:net";
import { homedir } from "node:os";
import { join } from "node:path";

/** The daemon's socket. One JSON object per line in, one per line out. */
const SOCKET = join(homedir(), "Library/Application Support/FSearch/fsearch.sock");

export type Kind = "file" | "dir" | "link" | "other";

export interface Hit {
  path: string;
  kind: Kind;
  size: number;
  /** Seconds since 1970. */
  mtime: number;
  score: number;
}

export interface GrepFile {
  path: string;
  matches: { line: number; text: string }[];
}

export interface SearchResult {
  hits: Hit[];
  tookMicros: number;
}

export interface GrepResult {
  files: GrepFile[];
  /** False when the time budget ran out before every candidate file was read. */
  complete: boolean;
  tookMicros: number;
}

/** Filter fields the daemon accepts beside `q` (`ext`, `kind`, `in`, and so on). */
export type Filters = Record<string, string>;

export type GrepMode = "literal" | "regex" | "symbol";

export type FSearchErrorReason = "missing" | "indexing" | "unreachable" | "query";

export class FSearchError extends Error {
  constructor(
    message: string,
    readonly reason: FSearchErrorReason,
  ) {
    super(message);
    this.name = "FSearchError";
  }
}

export function binaryPath() {
  const { binary } = getPreferenceValues<Preferences>();
  const path = binary?.trim() || "~/.local/bin/fsearch";
  return path.startsWith("~") ? join(homedir(), path.slice(1)) : path;
}

export async function search(q: string, filters: Filters, limit: number, signal?: AbortSignal): Promise<SearchResult> {
  const r = await request<{ hits: Hit[]; took_us: number }>({ q, ...filters, limit }, signal);
  return { hits: r.hits, tookMicros: r.took_us };
}

export async function grep(pattern: string, q: string, mode: GrepMode, signal?: AbortSignal): Promise<GrepResult> {
  const r = await request<{ files: GrepFile[]; complete: boolean; took_us: number }>(
    { op: "grep", pattern, q, mode, limit: 100, per_file: 10 },
    signal,
  );
  return { files: r.files, complete: r.complete, tookMicros: r.took_us };
}

async function request<T>(body: object, signal?: AbortSignal): Promise<T> {
  try {
    return await send<T>(body, signal);
  } catch (error) {
    if (!isNotRunning(error)) throw error;
    await startDaemon();
    return send<T>(body, signal);
  }
}

function send<T>(body: object, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const socket = connect(SOCKET);
    let buffer = "";
    const onAbort = () => {
      socket.destroy();
      reject(abortError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    const finish = () => signal?.removeEventListener("abort", onAbort);

    socket.setEncoding("utf8");
    socket.on("connect", () => socket.write(JSON.stringify(body) + "\n"));
    socket.on("data", (chunk: string) => {
      buffer += chunk;
      const end = buffer.indexOf("\n");
      if (end < 0) return;
      finish();
      socket.end();
      try {
        const response = JSON.parse(buffer.slice(0, end));
        if (response.ok) return resolve(response as T);
        const message = String(response.error ?? "FSearch returned an error");
        reject(new FSearchError(message, message.startsWith("indexing") ? "indexing" : "query"));
      } catch {
        reject(new FSearchError("FSearch sent a response that couldn't be read", "unreachable"));
      }
    });
    socket.on("error", (error) => {
      finish();
      reject(error);
    });
  });
}

function isNotRunning(error: unknown) {
  const code = (error as NodeJS.ErrnoException)?.code;
  return code === "ENOENT" || code === "ECONNREFUSED";
}

/** Any fsearch client starts the daemon when the socket isn't there; `status` is the cheapest one. */
function startDaemon(): Promise<void> {
  const bin = binaryPath();
  if (!existsSync(bin)) {
    return Promise.reject(new FSearchError(`FSearch isn't installed at ${bin}`, "missing"));
  }
  return new Promise((resolve, reject) => {
    execFile(bin, ["status"], { timeout: 10_000 }, (error) => {
      if (error && !existsSync(SOCKET)) {
        reject(new FSearchError("The FSearch daemon didn't start", "unreachable"));
      } else {
        resolve();
      }
    });
  });
}

function abortError() {
  const error = new Error("Aborted");
  error.name = "AbortError";
  return error;
}
