import { execFile } from "node:child_process";
import { createConnection, type Socket } from "node:net";
import { access, constants, readdir, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

export interface SearchFile {
  path: string;
  kind: string;
  size?: number;
  mtime?: number;
  matches?: { line: number; text: string }[];
}

export interface SearchResult {
  files: SearchFile[];
  tookUs: number;
  complete: boolean;
  indexing: boolean;
  /** Content search: files the index proposed, and how many were read before the budget ran out. */
  candidates?: number;
  read?: number;
}

/** Content-search tuning; ignored by name searches. */
export interface ContentOptions {
  /** Milliseconds to spend reading candidate files (daemon default 250). */
  budgetMs?: number;
}

export interface IndexStatus {
  fullDiskAccess: boolean;
  entries: number;
  contentDocs: number;
  contentPending: number;
}

/**
 * Why a search failed, so the UI can pick copy and recovery actions.
 *
 * - `missing`: the executable is not installed or not executable.
 * - `daemon`: the client could not reach (or start) the index daemon.
 * - `indexing`: the daemon is still building its first index; retry shortly.
 * - `timeout`: the executable did not answer in time.
 * - `query`: fsearch rejected the query (for example `type:bogus`).
 * - `protocol`: the response did not match the expected JSON shape.
 */
export type SearchErrorKind =
  "missing" | "daemon" | "indexing" | "timeout" | "query" | "protocol";

export class SearchError extends Error {
  readonly kind: SearchErrorKind;
  constructor(kind: SearchErrorKind, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "SearchError";
    this.kind = kind;
  }
}

export const DEFAULT_BINARY = "~/.local/bin/fsearch";
/** Where the fsearch daemon keeps its index, socket, and content store. */
export const INDEX_DIR = join(homedir(), "Library/Application Support/FSearch");
/** Home folders macOS gates behind Full Disk Access that people search most. */
export const PROTECTED_FOLDERS = ["Desktop", "Documents", "Downloads"] as const;
/** The daemon's JSON-lines socket. `null` forces the `fsearch stdio` fallback (tests). */
let socketPath: string | null = join(INDEX_DIR, "fsearch.sock");
const REQUEST_TIMEOUT_MS = 20000;
const MAX_OUTPUT_BYTES = 16 * 1024 * 1024;

/** Where `cargo install`, `fsearch install`, and Homebrew put the executable. */
export const BINARY_CANDIDATES = [
  "~/.local/bin/fsearch",
  "~/.cargo/bin/fsearch",
  "/opt/homebrew/bin/fsearch",
  "/usr/local/bin/fsearch",
] as const;

/** Expands a leading `~` and trims whitespace so preference typos do not break launching. */
export function resolveBinary(binaryPath: string): string {
  const trimmed = binaryPath.trim();
  if (trimmed === "~") return homedir();
  return trimmed.startsWith("~/") ? join(homedir(), trimmed.slice(2)) : trimmed;
}

async function isExecutable(path: string): Promise<boolean> {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * The executable to run, checked to exist. An explicit preference is used as
 * given; an empty one (or the historical default) looks through the usual
 * install locations, so `cargo install` and `fsearch install` both work
 * without configuration.
 */
export async function findBinary(
  binaryPath: string | undefined,
  executable: (path: string) => Promise<boolean> = isExecutable,
): Promise<string> {
  const trimmed = (binaryPath ?? "").trim();
  if (trimmed && trimmed !== DEFAULT_BINARY) {
    const binary = resolveBinary(trimmed);
    if (!isAbsolute(binary)) {
      throw new SearchError(
        "missing",
        "Set an absolute FSearch executable path in extension preferences.",
      );
    }
    if (!(await executable(binary))) {
      throw new SearchError(
        "missing",
        `Could not run FSearch at ${binary}. Check that it is installed and executable.`,
      );
    }
    return binary;
  }
  for (const candidate of BINARY_CANDIDATES) {
    const path = resolveBinary(candidate);
    if (await executable(path)) return path;
  }
  throw new SearchError(
    "missing",
    `FSearch is not installed. Looked in ${BINARY_CANDIDATES.map((candidate) => dirname(candidate)).join(", ")}.`,
  );
}

function classifyDaemonError(message: string): SearchErrorKind {
  const lower = message.toLowerCase();
  if (lower.startsWith("indexing")) return "indexing";
  if (lower.startsWith("cannot reach daemon")) return "daemon";
  return "query";
}

export function parseResponse(stdout: string): SearchResult {
  let data: unknown;
  try {
    data = JSON.parse(stdout);
  } catch (cause) {
    throw new SearchError(
      "protocol",
      "FSearch returned a response that is not JSON. Update fsearch and try again.",
      { cause },
    );
  }
  if (typeof data !== "object" || data === null || !("ok" in data)) {
    throw new SearchError(
      "protocol",
      "Unexpected fsearch response. Update fsearch and try again.",
    );
  }
  if (data.ok !== true) {
    const message =
      "error" in data && typeof data.error === "string" && data.error
        ? data.error
        : "FSearch could not complete the query.";
    throw new SearchError(classifyDaemonError(message), message);
  }
  if (!("took_us" in data) || typeof data.took_us !== "number") {
    throw new SearchError("protocol", "FSearch returned invalid timing data.");
  }
  const files: SearchFile[] = [];
  if ("hits" in data && Array.isArray(data.hits)) {
    for (const hit of data.hits as unknown[]) {
      if (
        typeof hit !== "object" ||
        hit === null ||
        !("path" in hit) ||
        typeof hit.path !== "string" ||
        !isAbsolute(hit.path) ||
        !("kind" in hit) ||
        typeof hit.kind !== "string" ||
        !("size" in hit) ||
        typeof hit.size !== "number"
      ) {
        throw new SearchError(
          "protocol",
          "FSearch returned an invalid file result.",
        );
      }
      const mtime = "mtime" in hit ? hit.mtime : undefined;
      if (
        mtime !== undefined &&
        (typeof mtime !== "number" || !Number.isFinite(mtime))
      ) {
        throw new SearchError(
          "protocol",
          "FSearch returned an invalid modification date.",
        );
      }
      files.push({
        path: hit.path,
        kind: hit.kind,
        size: hit.size,
        ...(mtime !== undefined ? { mtime } : {}),
      });
    }
  } else if ("files" in data && Array.isArray(data.files)) {
    for (const file of data.files as unknown[]) {
      if (
        typeof file !== "object" ||
        file === null ||
        !("path" in file) ||
        typeof file.path !== "string" ||
        !isAbsolute(file.path) ||
        !("matches" in file) ||
        !Array.isArray(file.matches)
      ) {
        throw new SearchError(
          "protocol",
          "FSearch returned an invalid content result.",
        );
      }
      const matches: { line: number; text: string }[] = [];
      for (const match of file.matches as unknown[]) {
        if (
          typeof match !== "object" ||
          match === null ||
          !("line" in match) ||
          typeof match.line !== "number" ||
          !("text" in match) ||
          typeof match.text !== "string"
        ) {
          throw new SearchError(
            "protocol",
            "FSearch returned an invalid content match.",
          );
        }
        matches.push({ line: match.line, text: match.text });
      }
      files.push({ path: file.path, kind: "file", matches });
    }
  } else {
    throw new SearchError("protocol", "FSearch returned no result collection.");
  }
  return {
    files,
    tookUs: data.took_us,
    complete: !("complete" in data) || data.complete === true,
    indexing: "indexing" in data && Boolean(data.indexing),
    ...("candidates" in data && typeof data.candidates === "number"
      ? { candidates: data.candidates }
      : {}),
    ...("read" in data && typeof data.read === "number"
      ? { read: data.read }
      : {}),
  };
}

export function parseStatus(stdout: string): IndexStatus {
  let data: unknown;
  try {
    data = JSON.parse(stdout);
  } catch (cause) {
    throw new SearchError(
      "protocol",
      "FSearch returned an unreadable status.",
      { cause },
    );
  }
  if (
    typeof data !== "object" ||
    data === null ||
    !("ok" in data) ||
    data.ok !== true
  ) {
    throw new SearchError("protocol", "FSearch did not report its status.");
  }
  const number = (key: string) =>
    typeof (data as Record<string, unknown>)[key] === "number"
      ? (data as Record<string, number>)[key]
      : 0;
  return {
    fullDiskAccess:
      "full_disk_access" in data && data.full_disk_access === true,
    entries: number("entries"),
    contentDocs: number("content_docs"),
    contentPending: number("content_pending"),
  };
}

function run(
  binary: string,
  args: string[],
  input: string | undefined,
  signal: AbortSignal,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const child = execFile(
      binary,
      args,
      {
        signal,
        timeout: REQUEST_TIMEOUT_MS,
        maxBuffer: MAX_OUTPUT_BYTES,
      },
      (error, output, stderr) => {
        if (!error) {
          resolve(output);
          return;
        }
        if (error.name === "AbortError" || signal.aborted) {
          reject(error);
          return;
        }
        const killedByTimeout =
          "killed" in error && error.killed === true && error.signal;
        if (killedByTimeout) {
          reject(
            new SearchError(
              "timeout",
              "FSearch did not answer in time. It may still be starting or busy indexing.",
              { cause: error },
            ),
          );
          return;
        }
        reject(
          new SearchError(
            "daemon",
            `Could not run FSearch at ${binary}. ${stderr.trim() || error.message}`,
            { cause: error },
          ),
        );
      },
    );
    if (input === undefined) return;
    // stdio sends structured queries, so filenames such as "install" never execute CLI commands.
    child.stdin?.on("error", (error: NodeJS.ErrnoException) => {
      // An early executable exit can close stdin before the request is written.
      if (error.code !== "EPIPE") reject(error);
    });
    child.stdin?.end(input);
  });
}

/**
 * One connection to the daemon's socket, shared by every request. Requests
 * are JSON lines tagged with an `id` the daemon echoes, so answers are matched
 * even when they arrive out of order.
 */
class DaemonClient {
  private nextId = 1;
  private buffer = "";
  private readonly pending = new Map<
    number,
    { resolve: (line: string) => void; reject: (error: Error) => void }
  >();

  private constructor(private readonly socket: Socket) {
    socket.setEncoding("utf8");
    socket.on("data", (chunk: string) => this.receive(chunk));
    socket.on("error", (error) => this.fail(error));
    socket.on("close", () =>
      this.fail(new Error("FSearch closed the connection.")),
    );
  }

  static connect(path: string): Promise<DaemonClient> {
    return new Promise((resolve, reject) => {
      const socket = createConnection({ path });
      socket.once("error", reject);
      socket.once("connect", () => {
        socket.off("error", reject);
        resolve(new DaemonClient(socket));
      });
    });
  }

  request(
    payload: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      const finish = (outcome: () => void) => {
        this.pending.delete(id);
        clearTimeout(timer);
        signal.removeEventListener("abort", onAbort);
        outcome();
      };
      const onAbort = () =>
        finish(() =>
          reject(signal.reason ?? new DOMException("Aborted", "AbortError")),
        );
      const timer = setTimeout(
        () =>
          finish(() =>
            reject(
              new SearchError(
                "timeout",
                "FSearch did not answer in time. It may still be starting or busy indexing.",
              ),
            ),
          ),
        REQUEST_TIMEOUT_MS,
      );
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
      this.pending.set(id, {
        resolve: (line) => finish(() => resolve(line)),
        reject: (error) => finish(() => reject(error)),
      });
      this.socket.write(JSON.stringify({ ...payload, id }) + "\n");
    });
  }

  close(): void {
    this.socket.destroy();
  }

  private receive(chunk: string): void {
    this.buffer += chunk;
    let newline = this.buffer.indexOf("\n");
    while (newline !== -1) {
      const line = this.buffer.slice(0, newline);
      this.buffer = this.buffer.slice(newline + 1);
      newline = this.buffer.indexOf("\n");
      let id: unknown;
      try {
        id = (JSON.parse(line) as { id?: unknown }).id;
      } catch {
        continue; // parseResponse reports unreadable lines; nothing to match here.
      }
      if (typeof id !== "number") continue;
      this.pending.get(id)?.resolve(line);
    }
  }

  private fail(cause: Error): void {
    if (client === this) client = null;
    for (const request of this.pending.values()) {
      request.reject(
        new SearchError(
          "daemon",
          `Lost the connection to FSearch. ${cause.message}`,
          {
            cause,
          },
        ),
      );
    }
    this.pending.clear();
  }
}

let client: DaemonClient | null = null;
let connecting: Promise<DaemonClient | null> | null = null;

/** Points the client at another socket, or `null` to always go through `fsearch stdio`. */
export function setSocketPath(path: string | null): void {
  socketPath = path;
  resetClient();
}

function resetClient(): void {
  client?.close();
  client = null;
  connecting = null;
}

/** Closes the daemon connection so a one-shot process, such as an AI tool, can exit. */
export function disconnect(): void {
  resetClient();
}

/** The shared connection, or `null` when no daemon is listening. */
async function connectDaemon(): Promise<DaemonClient | null> {
  if (!socketPath) return null;
  if (client) return client;
  connecting ??= DaemonClient.connect(socketPath).then(
    (connected) => {
      client = connected;
      connecting = null;
      return connected;
    },
    () => {
      connecting = null;
      return null;
    },
  );
  return connecting;
}

/**
 * Sends one request to the daemon. The socket is used when the daemon is up;
 * otherwise `fsearch stdio` answers, which also starts the daemon so the
 * following requests take the socket.
 */
async function exchange(
  binary: string,
  payload: Record<string, unknown>,
  signal: AbortSignal,
): Promise<string> {
  const daemon = await connectDaemon();
  if (daemon) return daemon.request(payload, signal);
  return run(binary, ["stdio"], JSON.stringify(payload) + "\n", signal);
}

const CONTENT_FILTERS = ["grep:", "regex:", "sym:", "content:", "symbol:"];

export async function searchFiles(
  binaryPath: string,
  query: string,
  root: string | undefined,
  limit: number,
  signal: AbortSignal,
  content: ContentOptions = {},
): Promise<SearchResult> {
  const binary = await findBinary(binaryPath);
  const isContentSearch = CONTENT_FILTERS.some((filter) =>
    query.includes(filter),
  );
  const request = {
    q: query,
    limit,
    ...(root ? { in: root } : {}),
    ...(isContentSearch && content.budgetMs
      ? { budget_ms: content.budgetMs }
      : {}),
  };
  return parseResponse(await exchange(binary, request, signal));
}

/** Reads daemon statistics, including whether protected folders are indexed. */
export async function getStatus(
  binaryPath: string,
  signal: AbortSignal,
): Promise<IndexStatus> {
  const binary = await findBinary(binaryPath);
  return parseStatus(await exchange(binary, { op: "status" }, signal));
}

/**
 * Protected folders that exist and contain visible files but have nothing in
 * the index. After Full Disk Access is granted, fsearch keeps replaying events
 * on top of the index it built without access, so these folders stay empty
 * until the index is rebuilt.
 */
export async function findUnindexedProtectedFolders(
  binaryPath: string,
  signal: AbortSignal,
): Promise<string[]> {
  const binary = await findBinary(binaryPath);
  const unindexed: string[] = [];
  for (const name of PROTECTED_FOLDERS) {
    const folder = join(homedir(), name);
    let entries: string[];
    try {
      entries = await readdir(folder);
    } catch {
      continue; // Missing folder, or Raycast itself lacks access: nothing to report.
    }
    if (!entries.some((entry) => !entry.startsWith("."))) continue;
    const result = parseResponse(
      await exchange(binary, { q: "", limit: 1, in: folder }, signal),
    );
    if (result.files.length === 0) unindexed.push(folder);
  }
  return unindexed;
}

function listProcesses(): Promise<{ pid: number; command: string }[]> {
  return new Promise((resolve, reject) => {
    execFile(
      "/bin/ps",
      ["-axo", "pid=,command="],
      { maxBuffer: MAX_OUTPUT_BYTES },
      (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }
        const processes: { pid: number; command: string }[] = [];
        for (const line of stdout.split("\n")) {
          const match = line.trim().match(/^(\d+)\s+(.*)$/);
          if (match)
            processes.push({ pid: Number(match[1]), command: match[2] });
        }
        resolve(processes);
      },
    );
  });
}

/**
 * Stops the fsearch daemon and deletes its index so the next search performs a
 * full crawl with the current permissions. The index is a cache that fsearch
 * rebuilds in about 20 seconds; the content index follows a few seconds later.
 */
export async function rebuildIndex(binaryPath: string): Promise<void> {
  const binary = await findBinary(binaryPath);
  resetClient();
  // Only fsearch daemons: ours by exact path, or any other "fsearch serve".
  const daemons = (await listProcesses()).filter(
    (process) =>
      process.command === `${binary} serve` ||
      /(^|\/)fsearch serve$/.test(process.command),
  );
  for (const daemon of daemons) {
    try {
      process.kill(daemon.pid, "SIGTERM");
    } catch {
      // Already gone.
    }
  }
  // Let the daemon exit before deleting, so it cannot write the old index back.
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const alive = daemons.some((daemon) => {
      try {
        process.kill(daemon.pid, 0);
        return true;
      } catch {
        return false;
      }
    });
    if (!alive) break;
    await sleep(100);
  }
  for (const daemon of daemons) {
    try {
      process.kill(daemon.pid, "SIGKILL");
    } catch {
      // Already gone.
    }
  }
  await rm(join(INDEX_DIR, "index.bin"), { force: true });
  await rm(join(INDEX_DIR, "content"), { recursive: true, force: true });
}
