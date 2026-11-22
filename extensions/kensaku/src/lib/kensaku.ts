import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { environment } from "@raycast/api";
import type {
  ExtensionPreferences,
  HttpHealthResponse,
  IndexStateResponse,
  SearchResponse,
  SnippetResponse,
  SymbolSearchResponse,
} from "./types";

export const DEFAULT_SERVER_PORT = 8765;
const STARTUP_TIMEOUT_MS = 25_000;
const STARTUP_POLL_MS = 200;
const REQUEST_TIMEOUT_MS = 15_000;

export type KensakuErrorCode =
  "CLI_NOT_FOUND" | "SERVER_OFFLINE" | "UNAUTHORIZED" | "NO_INDEX" | "INVALID_PORT" | "REQUEST_FAILED" | "TOOL_ERROR";

export class KensakuError extends Error {
  readonly code: KensakuErrorCode;

  constructor(code: KensakuErrorCode, message: string) {
    super(message);
    this.name = "KensakuError";
    this.code = code;
  }
}

export type ProbeResult =
  | { reachable: true; ok: true; health: HttpHealthResponse }
  | { reachable: true; ok: false; status: 401; reason: "unauthorized" }
  | { reachable: false; reason: "no_token" | "connection_refused" | "timeout" | "error"; detail?: string };

export interface ManagedServerStatus {
  pid: number | null;
  alive: boolean;
}

export interface ServerSnapshot {
  port: number;
  cliPath: string;
  configDir: string;
  tokenPresent: boolean;
  managed: ManagedServerStatus;
  running: boolean;
  health: HttpHealthResponse | null;
  indexState: IndexStateResponse | null;
  error: string | null;
}

let rpcCounter = 0;
let inFlightStart: { port: number; promise: Promise<{ port: number; health: HttpHealthResponse }> } | null = null;

function nextRpcId(): number {
  rpcCounter += 1;
  return rpcCounter;
}

/** Returns the platform-specific Kensaku configuration and index directory. */
export function getKensakuConfigDir(): string {
  if (process.platform === "win32") {
    const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appData, "kensaku");
  }
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "kensaku");
  }
  const xdgConfig = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  return path.join(xdgConfig, "kensaku");
}

/** Returns the path to Kensaku's loopback HTTP bearer token file. */
export function getHttpTokenPath(): string {
  return path.join(getKensakuConfigDir(), "http.token");
}

/** Reads the Kensaku HTTP bearer token if present on disk. */
export function readHttpToken(): string | null {
  try {
    const token = fs.readFileSync(getHttpTokenPath(), "utf8").trim();
    return token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

/** Parses and validates the configured loopback server port. */
export function getServerPort(prefs?: ExtensionPreferences): number {
  const raw = prefs?.serverPort?.trim();
  if (!raw) {
    return DEFAULT_SERVER_PORT;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1024 || parsed > 65535) {
    throw new KensakuError(
      "INVALID_PORT",
      `Invalid Local Server Port "${raw}". Choose an integer between 1024 and 65535.`,
    );
  }
  return parsed;
}

/** Resolves the `kensaku-cli` binary path from preferences or common install locations. */
export function resolveCliPath(configuredPath?: string): string {
  const explicit = configuredPath?.trim();
  if (explicit) {
    return explicit;
  }

  const home = os.homedir();
  const candidates: string[] = [];

  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA || path.join(home, "AppData", "Local");
    candidates.push(
      path.join(home, ".local", "bin", "kensaku-cli.exe"),
      path.join(localAppData, "kensaku", "kensaku-cli.exe"),
      path.join(localAppData, "Programs", "kensaku", "kensaku-cli.exe"),
    );
  } else {
    candidates.push(
      path.join(home, ".local", "bin", "kensaku-cli"),
      "/opt/homebrew/bin/kensaku-cli",
      "/usr/local/bin/kensaku-cli",
      "/usr/bin/kensaku-cli",
    );
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return "kensaku-cli";
}

function getManagedPidPath(): string {
  return path.join(environment.supportPath, "server.pid");
}

function readManagedPid(): number | null {
  try {
    const raw = fs.readFileSync(getManagedPidPath(), "utf8").trim();
    const pid = Number(raw);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

function writeManagedPid(pid: number): void {
  fs.mkdirSync(environment.supportPath, { recursive: true });
  fs.writeFileSync(getManagedPidPath(), String(pid), "utf8");
}

function clearManagedPid(): void {
  try {
    fs.unlinkSync(getManagedPidPath());
  } catch {
    // Ignore missing PID file.
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    return code === "EPERM";
  }
}

/** Returns whether a background server spawned by this extension is currently alive. */
export function getManagedServerStatus(): ManagedServerStatus {
  const pid = readManagedPid();
  if (!pid) {
    return { pid: null, alive: false };
  }
  const alive = isProcessAlive(pid);
  if (!alive) {
    clearManagedPid();
    return { pid: null, alive: false };
  }
  return { pid, alive: true };
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new Error("Aborted"));
      return;
    }

    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason ?? new Error("Aborted"));
    };

    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function createCombinedSignal(
  externalSignal: AbortSignal | undefined,
  timeoutMs: number,
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();

  const onExternalAbort = () => {
    controller.abort(externalSignal?.reason ?? new Error("Aborted"));
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason ?? new Error("Aborted"));
    } else {
      externalSignal.addEventListener("abort", onExternalAbort, { once: true });
    }
  }

  const timer = setTimeout(() => {
    controller.abort(new Error(`Request timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      externalSignal?.removeEventListener("abort", onExternalAbort);
    },
  };
}

function raceWithAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) {
    return promise;
  }
  if (signal.aborted) {
    return Promise.reject(signal.reason ?? new Error("Aborted"));
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason ?? new Error("Aborted"));
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

/** Returns true when an error represents an aborted fetch or sleep operation. */
export function isAbortError(error: unknown): boolean {
  if (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "AbortError"
  ) {
    return true;
  }
  return error instanceof Error && (error.name === "AbortError" || error.message === "Aborted");
}

/** Probes `GET /health` on `127.0.0.1:<port>`. */
export async function probeServerHealth(
  port: number,
  timeoutMs = REQUEST_TIMEOUT_MS,
  signal?: AbortSignal,
): Promise<ProbeResult> {
  const token = readHttpToken();
  if (!token) {
    return { reachable: false, reason: "no_token" };
  }

  const { signal: combined, cleanup } = createCombinedSignal(signal, timeoutMs);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: combined,
    });

    if (response.status === 401) {
      return { reachable: true, ok: false, status: 401, reason: "unauthorized" };
    }

    if (!response.ok) {
      return {
        reachable: false,
        reason: "error",
        detail: `HTTP ${response.status} ${response.statusText}`,
      };
    }

    const health = (await response.json()) as HttpHealthResponse;
    return { reachable: true, ok: true, health };
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("timed out")) {
      return { reachable: false, reason: "timeout", detail: message };
    }
    const causeCode = (error as { cause?: { code?: string } })?.cause?.code;
    if (causeCode === "ECONNREFUSED" || message.includes("ECONNREFUSED")) {
      return { reachable: false, reason: "connection_refused", detail: message };
    }
    return { reachable: false, reason: "error", detail: message };
  } finally {
    cleanup();
  }
}

async function spawnAndWaitForServer(
  port: number,
  cliPath: string,
): Promise<{ port: number; health: HttpHealthResponse }> {
  const procState: { spawnError: NodeJS.ErrnoException | null; earlyExitCode: number | null } = {
    spawnError: null,
    earlyExitCode: null,
  };

  const child = spawn(cliPath, ["serve", "--port", String(port)], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });

  child.on("error", (err) => {
    procState.spawnError = err as NodeJS.ErrnoException;
  });

  child.on("exit", (code) => {
    procState.earlyExitCode = code;
  });

  if (child.pid) {
    writeManagedPid(child.pid);
  }
  child.unref();

  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (procState.spawnError) {
      clearManagedPid();
      if (procState.spawnError.code === "ENOENT") {
        throw new KensakuError(
          "CLI_NOT_FOUND",
          `Could not find "${cliPath}". Install Kensaku CLI or set "Kensaku CLI Path" in Extension Preferences.`,
        );
      }
      throw new KensakuError("SERVER_OFFLINE", `Failed to start Kensaku server: ${procState.spawnError.message}`);
    }

    const probe = await probeServerHealth(port, REQUEST_TIMEOUT_MS);
    if (probe.reachable && probe.ok) {
      return { port, health: probe.health };
    }
    if (probe.reachable && !probe.ok) {
      throw new KensakuError(
        "UNAUTHORIZED",
        `Server on port ${port} rejected the token in "${getHttpTokenPath()}". Check if another service is using port ${port}.`,
      );
    }

    if (procState.earlyExitCode !== null) {
      clearManagedPid();
      throw new KensakuError(
        "SERVER_OFFLINE",
        `kensaku-cli serve exited immediately with code ${procState.earlyExitCode}. Ensure Kensaku is installed and has built an index.`,
      );
    }

    await sleep(STARTUP_POLL_MS);
  }

  throw new KensakuError(
    "SERVER_OFFLINE",
    `Timed out waiting for kensaku-cli serve on port ${port}. Try running "${cliPath} serve --port ${port}" in a terminal to inspect errors.`,
  );
}

/** Ensures `kensaku-cli serve` is running and healthy, starting it when configured. */
export async function ensureServerRunning(
  prefs: ExtensionPreferences,
  signal?: AbortSignal,
): Promise<{ port: number; health: HttpHealthResponse }> {
  const port = getServerPort(prefs);
  const initialProbe = await probeServerHealth(port, REQUEST_TIMEOUT_MS, signal);

  if (initialProbe.reachable) {
    if (initialProbe.ok) {
      return { port, health: initialProbe.health };
    }
    throw new KensakuError(
      "UNAUTHORIZED",
      `Server on port ${port} rejected the token in "${getHttpTokenPath()}". Another process may be bound to port ${port}.`,
    );
  }

  if (prefs.autoStartServer === false) {
    const cliPath = resolveCliPath(prefs.cliPath);
    throw new KensakuError(
      "SERVER_OFFLINE",
      `Kensaku server is not running on port ${port}. Start it with "${cliPath} serve --port ${port}" or enable Auto-Start in Extension Preferences.`,
    );
  }

  if (inFlightStart && inFlightStart.port === port) {
    return raceWithAbort(inFlightStart.promise, signal);
  }

  const cliPath = resolveCliPath(prefs.cliPath);
  const startPromise = spawnAndWaitForServer(port, cliPath).finally(() => {
    if (inFlightStart?.promise === startPromise) {
      inFlightStart = null;
    }
  });

  inFlightStart = { port, promise: startPromise };
  return raceWithAbort(startPromise, signal);
}

/** Stops the managed `kensaku-cli serve` background process if it was spawned by this extension. */
export async function stopManagedServer(
  port: number,
): Promise<{ stopped: boolean; pid: number | null; stillReachable: boolean }> {
  const { pid, alive } = getManagedServerStatus();
  if (!pid || !alive) {
    clearManagedPid();
    const probe = await probeServerHealth(port, 1000);
    return { stopped: false, pid: null, stillReachable: probe.reachable };
  }

  try {
    process.kill(pid);
  } catch {
    // Process may have exited between status check and kill.
  }
  clearManagedPid();

  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    const probe = await probeServerHealth(port, 800);
    if (!probe.reachable) {
      return { stopped: true, pid, stillReachable: false };
    }
    await sleep(150);
  }

  const finalProbe = await probeServerHealth(port, 800);
  return { stopped: true, pid, stillReachable: finalProbe.reachable };
}

/** Restarts the managed Kensaku search server so it picks up the latest index snapshot. */
export async function restartServer(
  prefs: ExtensionPreferences,
): Promise<{ port: number; health: HttpHealthResponse }> {
  const port = getServerPort(prefs);
  const stopResult = await stopManagedServer(port);
  if (stopResult.stillReachable) {
    throw new KensakuError(
      "SERVER_OFFLINE",
      `Port ${port} is still served by an external process not started by Raycast. Stop it manually and try again.`,
    );
  }
  return ensureServerRunning({ ...prefs, autoStartServer: true });
}

interface JsonRpcResponse {
  jsonrpc?: string;
  id?: number | string | null;
  error?: { code?: number; message?: string };
  result?: {
    isError?: boolean;
    content?: Array<{ type?: string; text?: string }>;
  };
}

/** Calls a Kensaku MCP tool over `POST /mcp`. */
export async function callMcpTool<T>(
  toolName: string,
  args: Record<string, unknown>,
  prefs: ExtensionPreferences,
  signal?: AbortSignal,
): Promise<T> {
  const { port } = await ensureServerRunning(prefs, signal);

  const invokeOnce = async (token: string): Promise<Response> => {
    const { signal: combined, cleanup } = createCombinedSignal(signal, REQUEST_TIMEOUT_MS);
    try {
      return await fetch(`http://127.0.0.1:${port}/mcp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: nextRpcId(),
          method: "tools/call",
          params: {
            name: toolName,
            arguments: args,
          },
        }),
        signal: combined,
      });
    } finally {
      cleanup();
    }
  };

  let token = readHttpToken();
  if (!token) {
    throw new KensakuError("UNAUTHORIZED", `HTTP token missing at "${getHttpTokenPath()}".`);
  }

  let response: Response;
  try {
    response = await invokeOnce(token);
    if (response.status === 401) {
      const refreshedToken = readHttpToken();
      if (refreshedToken && refreshedToken !== token) {
        token = refreshedToken;
        response = await invokeOnce(token);
      }
    }
  } catch (error) {
    if (isAbortError(error) || signal?.aborted) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new KensakuError("REQUEST_FAILED", `Failed to reach Kensaku server on port ${port}: ${message}`);
  }

  if (response.status === 401) {
    throw new KensakuError("UNAUTHORIZED", `Kensaku server on port ${port} rejected bearer token.`);
  }

  if (!response.ok) {
    throw new KensakuError("REQUEST_FAILED", `Kensaku server returned HTTP ${response.status} ${response.statusText}.`);
  }

  const rpc = (await response.json()) as JsonRpcResponse;
  if (rpc.error) {
    throw new KensakuError("TOOL_ERROR", rpc.error.message || `MCP tool "${toolName}" failed.`);
  }

  const text = rpc.result?.content?.[0]?.text ?? "";
  if (rpc.result?.isError) {
    const normalized = text.toLowerCase();
    if (normalized.includes("no kensaku index") || normalized.includes("index not found")) {
      throw new KensakuError("NO_INDEX", text || "No Kensaku index found. Launch Kensaku once to build it.");
    }
    throw new KensakuError("TOOL_ERROR", text || `Kensaku tool "${toolName}" returned an error.`);
  }

  if (!text) {
    throw new KensakuError("TOOL_ERROR", `Kensaku tool "${toolName}" returned an empty response.`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new KensakuError("TOOL_ERROR", `Invalid JSON returned by "${toolName}": ${text.slice(0, 160)}`);
  }
}

export interface SearchFilesOptions {
  query: string;
  pageSize: number;
  cursor?: string;
  mode?: "ranked" | "exhaustive";
  ext?: string;
  path?: string;
  modifiedAfter?: string;
}

/** Searches indexed files by name, full text, OCR, and semantic meaning. */
export async function searchFiles(
  options: SearchFilesOptions,
  prefs: ExtensionPreferences,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const args: Record<string, unknown> = {
    query: options.query,
    page_size: Math.min(Math.max(options.pageSize, 1), 50),
  };
  if (options.cursor) {
    args.cursor = options.cursor;
  }
  if (options.mode) {
    args.mode = options.mode;
  }
  if (options.ext) {
    args.ext = options.ext;
  }
  if (options.path) {
    args.path = options.path;
  }
  if (options.modifiedAfter) {
    args.modified_after = options.modifiedAfter;
  }

  return callMcpTool<SearchResponse>("search", args, prefs, signal);
}

/** Reads a centered text snippet for an indexed file. */
export async function readSnippet(
  options: { path: string; query?: string; maxTokens?: number },
  prefs: ExtensionPreferences,
  signal?: AbortSignal,
): Promise<SnippetResponse> {
  const args: Record<string, unknown> = {
    path: options.path,
  };
  if (options.query) {
    args.query = options.query;
  }
  if (options.maxTokens !== undefined) {
    args.max_tokens = Math.min(Math.max(options.maxTokens, 32), 1024);
  }

  return callMcpTool<SnippetResponse>("read_snippet", args, prefs, signal);
}

/** Searches tree-sitter extracted symbol definitions across indexed source files. */
export async function findSymbols(
  options: { query: string; language?: string; path?: string; pageSize?: number },
  prefs: ExtensionPreferences,
  signal?: AbortSignal,
): Promise<SymbolSearchResponse> {
  const args: Record<string, unknown> = {
    query: options.query,
  };
  if (options.language) {
    args.language = options.language;
  }
  if (options.path) {
    args.path = options.path;
  }
  if (options.pageSize !== undefined) {
    args.page_size = Math.min(Math.max(options.pageSize, 1), 50);
  }

  return callMcpTool<SymbolSearchResponse>("find_symbol", args, prefs, signal);
}

/** Returns detailed index statistics from Kensaku. */
export async function getIndexState(prefs: ExtensionPreferences, signal?: AbortSignal): Promise<IndexStateResponse> {
  return callMcpTool<IndexStateResponse>("index_state", {}, prefs, signal);
}

/** Checks server health and returns the `/health` payload (auto-starting if configured). */
export async function getServerHealth(prefs: ExtensionPreferences, signal?: AbortSignal): Promise<HttpHealthResponse> {
  const { health } = await ensureServerRunning(prefs, signal);
  return health;
}

/** Collects server, token, and index state information without throwing on offline servers. */
export async function getStatusSnapshot(
  prefs: ExtensionPreferences,
  options: { startIfStopped?: boolean } = {},
  signal?: AbortSignal,
): Promise<ServerSnapshot> {
  const port = getServerPort(prefs);
  const cliPath = resolveCliPath(prefs.cliPath);
  const configDir = getKensakuConfigDir();
  const tokenPresent = readHttpToken() !== null;
  const managed = getManagedServerStatus();

  try {
    let health: HttpHealthResponse | null = null;
    const probe = await probeServerHealth(port, REQUEST_TIMEOUT_MS, signal);
    if (probe.reachable && probe.ok) {
      health = probe.health;
    } else if (options.startIfStopped ?? prefs.autoStartServer !== false) {
      const started = await ensureServerRunning(prefs, signal);
      health = started.health;
    } else {
      const detail = probe.reachable ? `Port ${port} rejected bearer token.` : `Server is offline on port ${port}.`;
      return {
        port,
        cliPath,
        configDir,
        tokenPresent: readHttpToken() !== null,
        managed: getManagedServerStatus(),
        running: false,
        health: null,
        indexState: null,
        error: detail,
      };
    }

    let indexState: IndexStateResponse | null = null;
    let indexError: string | null = null;
    try {
      indexState = await getIndexState(prefs, signal);
    } catch (err) {
      indexError = err instanceof Error ? err.message : String(err);
    }

    return {
      port,
      cliPath,
      configDir,
      tokenPresent: readHttpToken() !== null,
      managed: getManagedServerStatus(),
      running: true,
      health,
      indexState,
      error: indexError,
    };
  } catch (err) {
    return {
      port,
      cliPath,
      configDir,
      tokenPresent,
      managed,
      running: false,
      health: null,
      indexState: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Formats user-facing guidance for Kensaku errors. */
export function getErrorDescription(error: unknown): { title: string; message: string } {
  if (error instanceof KensakuError) {
    switch (error.code) {
      case "CLI_NOT_FOUND":
        return { title: "Kensaku CLI Not Found", message: error.message };
      case "SERVER_OFFLINE":
        return { title: "Kensaku Server Offline", message: error.message };
      case "NO_INDEX":
        return { title: "No Kensaku Index Found", message: error.message };
      case "UNAUTHORIZED":
        return { title: "Server Authentication Failed", message: error.message };
      case "INVALID_PORT":
        return { title: "Invalid Server Port", message: error.message };
      default:
        return { title: "Kensaku Error", message: error.message };
    }
  }
  return {
    title: "Kensaku Error",
    message: error instanceof Error ? error.message : String(error),
  };
}
