import { environment, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { ChildProcessWithoutNullStreams, execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import * as fs from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";
import runtime from "../../codex-runtime.json";
import { getProxyUrl, proxyClientOptions } from "./proxy";

type JsonRpcId = number;

interface JsonRpcErrorShape {
  code?: number;
  message?: string;
  data?: unknown;
}

interface JsonRpcResponse {
  id: JsonRpcId;
  result?: unknown;
  error?: JsonRpcErrorShape;
}

interface JsonRpcNotification {
  method: string;
  params?: unknown;
}

interface JsonRpcServerRequest extends JsonRpcNotification {
  id: JsonRpcId;
}

type NotificationHandler = (params: unknown) => void;

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

const CLIENT_INFO = {
  name: "raycast_chatgpt_extension",
  title: "Raycast ChatGPT Extension",
  version: "0.1.0",
};

const CODEX_VERSION = runtime.version;

let bootstrapCodexRuntimePromise: Promise<CodexCommand> | null = null;
let sharedCodexAppServerClientPromise: Promise<CodexAppServerClient> | null = null;
let sharedCodexAppServerUsageCount = 0;
let sharedCodexAppServerIdleTimer: NodeJS.Timeout | null = null;

const SHARED_CODEX_APP_SERVER_IDLE_MS = 2 * 60 * 1000;
// Leave room for JSON parsing and the rest of the command in Raycast's 100 MB worker.
const MAX_RPC_LINE_LENGTH = 4 * 1024 * 1024;
const execFileAsync = promisify(execFile);

interface CodexCommand {
  executable: string;
  args: string[];
  env: NodeJS.ProcessEnv;
}

export interface CodexAppServerModel {
  id: string;
  model: string;
  displayName?: string;
  hidden?: boolean;
  isDefault?: boolean;
  supportedReasoningEfforts?: Array<{ reasoningEffort: string; description: string }>;
}

export class CodexAppServerClient {
  private readonly proc: ChildProcessWithoutNullStreams;
  private readonly pendingRequests = new Map<JsonRpcId, PendingRequest>();
  private readonly notificationHandlers = new Map<string, Set<NotificationHandler>>();
  private readonly closeHandlers = new Set<(error: Error) => void>();
  private readonly exitPromise: Promise<void>;

  private nextId = 0;
  private stderr = "";
  private closed = false;

  get isClosed(): boolean {
    return this.closed;
  }

  private constructor(proc: ChildProcessWithoutNullStreams) {
    this.proc = proc;
    let partialLine = "";
    proc.stdout.setEncoding("utf8");
    proc.stdout.on("data", (chunk: string) => {
      if (this.closed) return;
      let start = 0;
      while (start < chunk.length) {
        const newline = chunk.indexOf("\n", start);
        const end = newline === -1 ? chunk.length : newline;
        if (partialLine.length + end - start > MAX_RPC_LINE_LENGTH) {
          const error = new Error(
            "Codex returned a response too large for Raycast. Try a smaller request or start a new conversation.",
          );
          partialLine = "";
          this.failAllPending(error);
          this.failAllNotificationWaiters(error);
          void this.close();
          return;
        }
        partialLine += chunk.slice(start, end);
        if (newline === -1) return;
        this.handleLine(partialLine);
        partialLine = "";
        start = end + 1;
      }
    });

    proc.stderr.on("data", (chunk: Buffer | string) => {
      this.stderr = (this.stderr + chunk.toString()).slice(-8192);
    });

    proc.on("error", (error) => {
      this.failAllPending(normalizeCodexAppServerError(error));
    });

    this.exitPromise = new Promise((resolve) => {
      proc.once("exit", (code, signal) => {
        this.closed = true;
        partialLine = "";

        const details = this.stderr.trim();
        const suffix = details ? ` ${details}` : "";
        const processError =
          code === 0 || signal === "SIGTERM"
            ? null
            : new Error(`Codex app-server exited unexpectedly (${code ?? signal ?? "unknown"}).${suffix}`.trim());

        const finalError = processError
          ? normalizeCodexAppServerError(processError)
          : new Error("Codex app-server closed before the request completed.");

        this.failAllPending(finalError);
        this.failAllNotificationWaiters(finalError);

        resolve();
      });
    });
  }

  static async create(): Promise<CodexAppServerClient> {
    const command = await resolveBundledCodexCommand();
    const proc = spawn(command.executable, command.args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: command.env,
    });

    const client = new CodexAppServerClient(proc);
    await client.request("initialize", {
      clientInfo: CLIENT_INFO,
    });
    client.notify("initialized", {});
    return client;
  }

  async request<T>(method: string, params?: unknown): Promise<T> {
    if (this.closed) {
      throw new Error("Codex app-server is not running.");
    }

    const id = ++this.nextId;
    const payload: Record<string, unknown> = { method, id };
    if (params !== undefined) {
      payload.params = params;
    }

    const result = new Promise<T>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve: resolve as (value: unknown) => void, reject });
    });

    this.send(payload);
    return result;
  }

  notify(method: string, params?: unknown): void {
    if (this.closed) {
      return;
    }

    const payload: Record<string, unknown> = { method };
    if (params !== undefined) {
      payload.params = params;
    }
    this.send(payload);
  }

  onNotification(method: string, handler: NotificationHandler): () => void {
    const handlers = this.notificationHandlers.get(method) ?? new Set<NotificationHandler>();
    handlers.add(handler);
    this.notificationHandlers.set(method, handlers);

    return () => {
      const currentHandlers = this.notificationHandlers.get(method);
      if (!currentHandlers) {
        return;
      }
      currentHandlers.delete(handler);
      if (currentHandlers.size === 0) {
        this.notificationHandlers.delete(method);
      }
    };
  }

  waitForNotification<T>(
    method: string,
    predicate: (params: T) => boolean = () => true,
    signal?: AbortSignal,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const onAbort = () => {
        unsubscribe();
        this.closeHandlers.delete(onClose);
        reject(createAbortError());
      };

      const onClose = (error: Error) => {
        signal?.removeEventListener("abort", onAbort);
        unsubscribe();
        this.closeHandlers.delete(onClose);
        reject(error);
      };

      const unsubscribe = this.onNotification(method, (rawParams) => {
        const params = rawParams as T;
        if (!predicate(params)) {
          return;
        }

        signal?.removeEventListener("abort", onAbort);
        unsubscribe();
        this.closeHandlers.delete(onClose);
        resolve(params);
      });

      this.closeHandlers.add(onClose);

      if (signal) {
        if (signal.aborted) {
          unsubscribe();
          this.closeHandlers.delete(onClose);
          reject(createAbortError());
          return;
        }
        signal.addEventListener("abort", onAbort, { once: true });
      }
    });
  }

  async close(): Promise<void> {
    if (this.closed) {
      await this.exitPromise;
      return;
    }

    this.closed = true;
    this.proc.stdin.end();

    const timer = setTimeout(() => {
      if (!this.proc.killed) {
        this.proc.kill("SIGTERM");
      }
    }, 250);

    try {
      await this.exitPromise;
    } finally {
      clearTimeout(timer);
    }
  }

  private send(payload: Record<string, unknown>): void {
    this.proc.stdin.write(`${JSON.stringify(payload)}\n`);
  }

  private handleLine(line: string): void {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }

    let message: unknown;
    try {
      message = JSON.parse(trimmed);
    } catch {
      return;
    }

    if (!message || typeof message !== "object") {
      return;
    }

    if (hasMethod(message) && hasId(message)) {
      this.respondToServerRequest(message);
      return;
    }

    if (hasMethod(message)) {
      this.dispatchNotification(message.method, (message as JsonRpcNotification).params);
      return;
    }

    if (!hasId(message)) {
      return;
    }

    const response = message as JsonRpcResponse;
    const pendingRequest = this.pendingRequests.get(response.id);
    if (!pendingRequest) {
      return;
    }

    this.pendingRequests.delete(response.id);

    if (response.error) {
      pendingRequest.reject(buildRpcError(response.error));
      return;
    }

    pendingRequest.resolve(response.result);
  }

  private respondToServerRequest(message: JsonRpcServerRequest): void {
    this.send({
      id: message.id,
      error: {
        code: -32601,
        message: `Unsupported server request: ${message.method}`,
      },
    });
  }

  private dispatchNotification(method: string, params: unknown): void {
    const handlers = this.notificationHandlers.get(method);
    if (!handlers) {
      return;
    }

    for (const handler of handlers) {
      handler(params);
    }
  }

  private failAllPending(error: Error): void {
    for (const [id, pendingRequest] of this.pendingRequests.entries()) {
      this.pendingRequests.delete(id);
      pendingRequest.reject(error);
    }
  }

  private failAllNotificationWaiters(error: Error): void {
    for (const handler of this.closeHandlers) {
      handler(error);
    }
    this.closeHandlers.clear();
  }
}

export async function withCodexAppServer<T>(work: (client: CodexAppServerClient) => Promise<T>): Promise<T> {
  const client = await acquireSharedCodexAppServerClient();
  try {
    return await work(client);
  } finally {
    releaseSharedCodexAppServerClient();
  }
}

async function acquireSharedCodexAppServerClient(): Promise<CodexAppServerClient> {
  if (sharedCodexAppServerIdleTimer) {
    clearTimeout(sharedCodexAppServerIdleTimer);
    sharedCodexAppServerIdleTimer = null;
  }

  if (sharedCodexAppServerClientPromise && (await sharedCodexAppServerClientPromise).isClosed) {
    sharedCodexAppServerClientPromise = null;
  }
  if (!sharedCodexAppServerClientPromise) {
    sharedCodexAppServerClientPromise = CodexAppServerClient.create().catch((error) => {
      sharedCodexAppServerClientPromise = null;
      throw error;
    });
  }

  sharedCodexAppServerUsageCount += 1;
  try {
    return await sharedCodexAppServerClientPromise;
  } catch (error) {
    sharedCodexAppServerUsageCount -= 1;
    throw error;
  }
}

function releaseSharedCodexAppServerClient(): void {
  sharedCodexAppServerUsageCount = Math.max(0, sharedCodexAppServerUsageCount - 1);
  if (sharedCodexAppServerUsageCount > 0 || sharedCodexAppServerIdleTimer) {
    return;
  }

  sharedCodexAppServerIdleTimer = setTimeout(() => {
    const clientPromise = sharedCodexAppServerClientPromise;
    sharedCodexAppServerClientPromise = null;
    sharedCodexAppServerIdleTimer = null;

    if (!clientPromise) {
      return;
    }

    clientPromise
      .then((client) => client.close())
      .catch(() => {
        // Ignore shutdown errors for the shared idle client.
      });
  }, SHARED_CODEX_APP_SERVER_IDLE_MS);
}

let modelCatalog: { expiresAt: number; result: Promise<CodexAppServerModel[]> } | undefined;

export function clearCodexModelCatalog(): void {
  modelCatalog = undefined;
}

export function listCodexAppServerModels(): Promise<CodexAppServerModel[]> {
  if (modelCatalog && Date.now() < modelCatalog.expiresAt) return modelCatalog.result;
  const result = fetchCodexModels();
  modelCatalog = { expiresAt: Date.now() + 30_000, result };
  void result.catch(() => {
    if (modelCatalog?.result === result) clearCodexModelCatalog();
  });
  return result;
}

async function fetchCodexModels(): Promise<CodexAppServerModel[]> {
  return withCodexAppServer(async (client) => {
    const models: CodexAppServerModel[] = [];
    let cursor: string | null = null;

    do {
      const response: {
        data: CodexAppServerModel[];
        nextCursor: string | null;
      } = await client.request("model/list", {
        limit: 100,
        includeHidden: false,
        ...(cursor ? { cursor } : {}),
      });

      models.push(...response.data);
      cursor = response.nextCursor;
    } while (cursor);

    return models;
  });
}

function hasMethod(value: object): value is JsonRpcNotification {
  return "method" in value && typeof (value as { method?: unknown }).method === "string";
}

function hasId(value: object): value is { id: JsonRpcId } {
  return "id" in value && typeof (value as { id?: unknown }).id === "number";
}

function buildRpcError(error: JsonRpcErrorShape): Error {
  const message = error.message?.trim() || "Codex app-server request failed.";
  const details = stringifyErrorData(error.data);
  const result = new Error(details ? `${message} ${details}` : message) as Error & { code?: number; data?: unknown };
  result.code = error.code;
  result.data = error.data;
  return result;
}

function stringifyErrorData(data: unknown): string {
  if (typeof data === "string") {
    return data.trim();
  }

  if (data === undefined) {
    return "";
  }

  try {
    return JSON.stringify(data);
  } catch {
    return "";
  }
}

function normalizeCodexAppServerError(error: unknown): Error {
  const fallback = error instanceof Error ? error : new Error(String(error));
  const message = fallback.message.toLowerCase();

  if (message.includes("enoent") || message.includes("cannot find module") || message.includes("cannot find package")) {
    return new Error("Codex runtime setup failed. Rebuild the extension to include the required app-server files.");
  }

  return fallback;
}

async function resolveBundledCodexCommand(): Promise<CodexCommand> {
  if (!bootstrapCodexRuntimePromise) {
    bootstrapCodexRuntimePromise = bootstrapCodexRuntime();
  }

  try {
    return await bootstrapCodexRuntimePromise;
  } catch (error) {
    bootstrapCodexRuntimePromise = null;
    throw error;
  }
}

async function bootstrapCodexRuntime(): Promise<CodexCommand> {
  const { target, runtimeRoot, binaryRelativePath, binaryPath } = getRuntimePaths();
  const pathDir = path.join(runtimeRoot, "vendor", target, "codex-path");

  if (!(await fileExists(binaryPath))) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Downloading Codex runtime..." });
    try {
      await installCodexRuntime(target, runtimeRoot, binaryRelativePath);
    } finally {
      await toast.hide();
    }
  }

  await ensureExecutable(binaryPath);
  await ensureExecutable(path.join(pathDir, process.platform === "win32" ? "rg.exe" : "rg"));

  const env = { ...process.env };
  const proxyUrl = getProxyUrl(getPreferenceValues<Preferences>());
  if (proxyUrl) {
    env.HTTP_PROXY = proxyUrl;
    env.HTTPS_PROXY = proxyUrl;
    env.ALL_PROXY = proxyUrl;
  }
  if (await directoryExists(pathDir)) {
    env.PATH = prependToPath(pathDir, env.PATH);
  }

  return {
    executable: binaryPath,
    args: ["app-server"],
    env,
  };
}

function getRuntimePaths() {
  const target = resolveTargetTriple();
  const runtimeRoot = path.join(environment.supportPath, "codex-runtime", CODEX_VERSION, target);
  const binaryRelativePath = path.join("vendor", target, "bin", process.platform === "win32" ? "codex.exe" : "codex");
  return { target, runtimeRoot, binaryRelativePath, binaryPath: path.join(runtimeRoot, binaryRelativePath) };
}

export async function hasInstalledCodexRuntime(): Promise<boolean> {
  if (process.platform !== "darwin" && process.platform !== "win32") return false;
  return fileExists(getRuntimePaths().binaryPath);
}

export async function readLocalCodexLoginStatus(): Promise<boolean | undefined> {
  if (!(await hasInstalledCodexRuntime())) return undefined;
  const { binaryPath } = getRuntimePaths();
  try {
    const { stdout, stderr } = await execFileAsync(binaryPath, ["login", "status"], {
      timeout: 1_500,
      maxBuffer: 8 * 1024,
      windowsHide: true,
    });
    const status = stdout + "\n" + stderr;
    if (/^Logged in using ChatGPT\b/m.test(status)) return true;
    if (/^Logged in using an API key\b/m.test(status)) return false;
  } catch (error) {
    const status = error as { code?: number; stdout?: string; stderr?: string };
    if (status.code === 1 && /^Not logged in\s*$/m.test(`${status.stdout}\n${status.stderr}`)) return false;
  }
  // Fall back to account/read if the pinned runtime returns an unexpected result.
  return undefined;
}

function resolveTargetTriple(): keyof typeof runtime.packages {
  const targetTriple =
    process.platform === "darwin"
      ? process.arch === "arm64"
        ? "aarch64-apple-darwin"
        : process.arch === "x64"
          ? "x86_64-apple-darwin"
          : null
      : process.platform === "win32"
        ? process.arch === "arm64"
          ? "aarch64-pc-windows-msvc"
          : process.arch === "x64"
            ? "x86_64-pc-windows-msvc"
            : null
        : null;

  if (!targetTriple) {
    throw new Error(`Unsupported platform for bundled Codex runtime: ${process.platform} (${process.arch}).`);
  }

  return targetTriple;
}

async function installCodexRuntime(
  target: keyof typeof runtime.packages,
  runtimeRoot: string,
  binaryRelativePath: string,
): Promise<void> {
  await fs.mkdir(path.dirname(runtimeRoot), { recursive: true });
  const tempRoot = await fs.mkdtemp(path.join(path.dirname(runtimeRoot), "codex-runtime-stage-"));
  const archivePath = path.join(tempRoot, "codex.tgz");
  const extractRoot = path.join(tempRoot, "extract");

  try {
    await downloadCodexArchive(target, archivePath);
    if (await fileExists(path.join(runtimeRoot, binaryRelativePath))) return;

    await fs.mkdir(extractRoot, { recursive: true });
    // Unpack outside Raycast's command heap using the system tar on macOS and Windows 11.
    const tar =
      process.platform === "win32"
        ? path.join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe")
        : "/usr/bin/tar";
    await execFileAsync(tar, ["-xf", archivePath, "--strip-components=1", "-C", extractRoot], {
      timeout: 120_000,
      maxBuffer: 64 * 1024,
      windowsHide: true,
    });
    const binary = path.join(extractRoot, binaryRelativePath);
    if (!(await fileExists(binary))) throw new Error(`Bundled Codex archive is invalid for ${target}.`);

    // Publishing a complete directory is atomic. If another command won, use its installation.
    try {
      await fs.rename(extractRoot, runtimeRoot);
    } catch (error) {
      if (!(await fileExists(path.join(runtimeRoot, binaryRelativePath)))) throw error;
    }
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

async function downloadCodexArchive(target: keyof typeof runtime.packages, destination: string): Promise<void> {
  const suffix = runtime.packages[target];
  const url = `https://registry.npmjs.org/@openai/codex/-/codex-${CODEX_VERSION}-${suffix}.tgz`;
  const controller = new AbortController();
  const hash = createHash("sha256");
  let idleTimer: NodeJS.Timeout | undefined;
  const resetIdleTimer = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => controller.abort(new Error("Codex runtime download stalled.")), 60_000);
  };
  resetIdleTimer();
  try {
    const preferences = getPreferenceValues<Preferences>();
    const downloadFetch = proxyClientOptions(preferences).fetch ?? fetch;
    const response = await downloadFetch(url, { signal: controller.signal });
    if (!response.ok || !response.body) {
      throw new Error(`Codex runtime download failed (${response.status} ${response.statusText}).`);
    }
    const progress = new Transform({
      transform(chunk, _encoding, callback) {
        resetIdleTimer();
        hash.update(chunk);
        callback(null, chunk);
      },
    });
    await pipeline(Readable.fromWeb(response.body as never), progress, createWriteStream(destination), {
      signal: controller.signal,
    });
    if (hash.digest("hex") !== runtime.sha256[target]) {
      throw new Error(`Codex archive failed integrity verification for ${target}.`);
    }
  } catch (error) {
    if (controller.signal.aborted) throw controller.signal.reason;
    throw error;
  } finally {
    if (idleTimer) clearTimeout(idleTimer);
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

async function ensureExecutable(filePath: string): Promise<void> {
  if (!(await fileExists(filePath)) || process.platform === "win32") {
    return;
  }

  await fs.chmod(filePath, 0o755);
}

function prependToPath(entry: string, currentPath: string | undefined): string {
  const separator = process.platform === "win32" ? ";" : ":";
  const existingEntries = (currentPath ?? "").split(separator).filter(Boolean);
  return [entry, ...existingEntries.filter((value) => value !== entry)].join(separator);
}

function createAbortError(): Error {
  const error = new Error("AbortError");
  error.name = "AbortError";
  return error;
}
