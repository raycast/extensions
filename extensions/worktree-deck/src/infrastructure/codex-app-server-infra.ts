import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { get } from "node:http";
import { homedir } from "node:os";
import { delimiter } from "node:path";
import type {
  CodexApprovalPolicy,
  CodexApprovalsReviewer,
  CodexInitialSessionMetadata,
  CodexReasoningEffort,
  CodexSandboxMode,
  CodexServiceTier,
  CodexWebSearchMode,
  StartCodexInitialSessionCommand,
  StartCodexInitialSessionResult,
} from "../application/start-codex-initial-session.usecase";
import { normalizeExternalCommandError } from "./external-command-error";

/**
 * app-server の既定ポート
 */
const DEFAULT_CODEX_APP_SERVER_PORT = 53621;

/**
 * app-server 起動待ちタイムアウト
 */
const APP_SERVER_READY_TIMEOUT_MS = 8_000;

/**
 * JSON-RPC 応答待ちタイムアウト
 */
const JSON_RPC_TIMEOUT_MS = 15_000;

/**
 * PATHに追加する代表的な検索ディレクトリ
 */
const DEFAULT_COMMAND_PATHS = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", "/usr/sbin", "/sbin"];

type JsonObject = Record<string, unknown>;

type WebSocketMessageEventLike = {
  data: unknown;
};

type WebSocketLike = {
  onopen: (() => void) | null;
  onmessage: ((event: WebSocketMessageEventLike) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onclose: (() => void) | null;
  send(data: string): void;
  close(): void;
};

type WebSocketConstructorLike = new (url: string) => WebSocketLike;

type JsonRpcClient = {
  request<T>(method: string, params: unknown): Promise<T>;
  close(): void;
};

/**
 * codex コマンド探索用 PATH を組み立てる
 */
function buildCommandPath(currentPath?: string): string {
  const segments = new Set((currentPath ?? "").split(delimiter).filter((segment) => segment.trim().length > 0));
  for (const path of DEFAULT_COMMAND_PATHS) {
    segments.add(path);
  }
  return Array.from(segments).join(delimiter);
}

/**
 * app-server のポートを環境変数または既定値から解決する
 */
function resolveAppServerPort(env: NodeJS.ProcessEnv = process.env): number {
  const rawPort = env.WORKTREE_DECK_CODEX_APP_SERVER_PORT?.trim();
  if (!rawPort) {
    return DEFAULT_CODEX_APP_SERVER_PORT;
  }
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    return DEFAULT_CODEX_APP_SERVER_PORT;
  }
  return port;
}

/**
 * app-server の WebSocket endpoint を組み立てる
 */
function buildAppServerEndpoint(port: number): string {
  return `ws://127.0.0.1:${port}`;
}

/**
 * app-server の ready endpoint を組み立てる
 */
function buildReadyUrl(port: number): string {
  return `http://127.0.0.1:${port}/readyz`;
}

/**
 * 指定 URL が 2xx を返すか確認する
 */
async function isHttpOk(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const request = get(url, (response) => {
      response.resume();
      resolve((response.statusCode ?? 0) >= 200 && (response.statusCode ?? 0) < 300);
    });
    request.setTimeout(1_000, () => {
      request.destroy();
      resolve(false);
    });
    request.on("error", () => {
      resolve(false);
    });
  });
}

/**
 * app-server が ready になるまで待つ
 */
async function waitForAppServerReady(port: number): Promise<void> {
  const deadline = Date.now() + APP_SERVER_READY_TIMEOUT_MS;
  const readyUrl = buildReadyUrl(port);
  while (Date.now() < deadline) {
    if (await isHttpOk(readyUrl)) {
      return;
    }
    await delay(150);
  }
  throw new Error("Codex app-server did not become ready.");
}

/**
 * app-server を必要に応じて起動し endpoint を返す
 */
async function ensureCodexAppServer(): Promise<string> {
  const port = resolveAppServerPort();
  const readyUrl = buildReadyUrl(port);
  if (await isHttpOk(readyUrl)) {
    return buildAppServerEndpoint(port);
  }

  const endpoint = buildAppServerEndpoint(port);
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const child = spawn("codex", ["app-server", "--listen", endpoint], {
      detached: true,
      env: {
        ...process.env,
        PATH: buildCommandPath(process.env.PATH),
      },
      stdio: "ignore",
    });
    child.once("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      reject(normalizeExternalCommandError(error, "codex", "codex-action"));
    });
    child.unref();
    waitForAppServerReady(port)
      .then(() => {
        if (settled) {
          return;
        }
        settled = true;
        resolve();
      })
      .catch((error) => {
        if (settled) {
          return;
        }
        settled = true;
        reject(error);
      });
  });
  return endpoint;
}

/**
 * WebSocket 実装を取得する
 */
function resolveWebSocketConstructor(): WebSocketConstructorLike {
  const WebSocketCtor = (globalThis as typeof globalThis & { WebSocket?: WebSocketConstructorLike }).WebSocket;
  if (!WebSocketCtor) {
    throw new Error("WebSocket is not available in this runtime.");
  }
  return WebSocketCtor;
}

/**
 * app-server 用 JSON-RPC client を作成する
 */
async function createJsonRpcClient(endpoint: string): Promise<JsonRpcClient> {
  const WebSocketCtor = resolveWebSocketConstructor();
  const socket = new WebSocketCtor(endpoint);
  let nextId = 1;
  const pending = new Map<
    number,
    {
      resolve(value: unknown): void;
      reject(error: Error): void;
      timeout: NodeJS.Timeout;
    }
  >();

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Codex app-server connection timed out.")), JSON_RPC_TIMEOUT_MS);
    socket.onopen = () => {
      clearTimeout(timeout);
      resolve();
    };
    socket.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("Failed to connect to Codex app-server."));
    };
  });

  socket.onmessage = (event) => {
    const message = parseJsonObject(event.data);
    const id = typeof message.id === "number" ? message.id : null;
    if (id === null) {
      return;
    }
    const entry = pending.get(id);
    if (!entry) {
      return;
    }
    pending.delete(id);
    clearTimeout(entry.timeout);
    if (isJsonObject(message.error)) {
      entry.reject(new Error(formatJsonRpcError(message.error)));
      return;
    }
    entry.resolve(message.result);
  };
  socket.onerror = () => {
    for (const entry of pending.values()) {
      clearTimeout(entry.timeout);
      entry.reject(new Error("Codex app-server connection failed."));
    }
    pending.clear();
  };
  socket.onclose = () => {
    for (const entry of pending.values()) {
      clearTimeout(entry.timeout);
      entry.reject(new Error("Codex app-server connection closed."));
    }
    pending.clear();
  };

  return {
    request<T>(method: string, params: unknown): Promise<T> {
      const id = nextId;
      nextId += 1;
      const payload = JSON.stringify({ id, method, params });
      return new Promise<T>((resolve, reject) => {
        const timeout = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`Codex app-server request timed out: ${method}`));
        }, JSON_RPC_TIMEOUT_MS);
        pending.set(id, {
          resolve: (value) => resolve(value as T),
          reject,
          timeout,
        });
        socket.send(payload);
      });
    },
    close() {
      socket.close();
    },
  };
}

/**
 * app-server の初期化 request を送る
 */
async function initializeClient(client: JsonRpcClient): Promise<void> {
  await client.request("initialize", {
    clientInfo: {
      name: "worktree-deck",
      version: "0.0.0",
    },
    capabilities: null,
  });
}

/**
 * Codex 初回セッションの既定メタ情報を global config から読む
 */
export async function loadCodexInitialSessionDefaultsFromGlobalConfig(args: {
  repoRoot: string;
}): Promise<CodexInitialSessionMetadata> {
  const repoRoot = args.repoRoot.trim();
  if (!repoRoot) {
    throw new Error("Repository is required.");
  }
  try {
    const config = parseTopLevelTomlStrings(await readFile(resolveCodexConfigPath(), "utf8"));
    return {
      model: readString(config.model) || "gpt-5.5",
      serviceTier: readServiceTier(config.service_tier),
      reasoningEffort: readReasoningEffort(config.model_reasoning_effort),
      approvalPolicy: readApprovalPolicy(config.approval_policy),
      sandboxMode: readSandboxMode(config.sandbox_mode),
      approvalsReviewer: readApprovalsReviewer(config.approvals_reviewer),
      webSearch: readWebSearchMode(config.web_search),
    };
  } catch {
    return {
      model: "gpt-5.5",
      serviceTier: "default",
      reasoningEffort: "medium",
      approvalPolicy: "on-request",
      sandboxMode: "workspace-write",
      approvalsReviewer: "user",
      webSearch: "cached",
    };
  }
}

/**
 * app-server で Codex 初回セッションを開始する
 */
export async function startCodexInitialSessionWithAppServer(
  command: StartCodexInitialSessionCommand,
): Promise<StartCodexInitialSessionResult> {
  const worktreePath = command.worktreePath.trim();
  if (!worktreePath) {
    throw new Error("Worktree path is required.");
  }
  const initialPrompt = command.initialPrompt.trim();
  if (!initialPrompt) {
    throw new Error("Initial prompt is required.");
  }

  const client = await createJsonRpcClient(await ensureCodexAppServer());
  try {
    await initializeClient(client);
    const threadResult = await client.request<{ thread?: { id?: unknown } }>(
      "thread/start",
      buildCodexThreadStartParams({ worktreePath, metadata: command.metadata }),
    );
    const threadId = typeof threadResult.thread?.id === "string" ? threadResult.thread.id.trim() : "";
    if (!threadId) {
      throw new Error("Codex app-server did not return a thread id.");
    }
    await client.request(
      "turn/start",
      buildCodexTurnStartParams({ threadId, initialPrompt, metadata: command.metadata }),
    );
    return { threadId };
  } finally {
    client.close();
  }
}

/**
 * app-server の thread/start payload を組み立てる
 */
export function buildCodexThreadStartParams(args: {
  worktreePath: string;
  metadata: CodexInitialSessionMetadata;
}): JsonObject {
  return {
    model: args.metadata.model || null,
    serviceTier: resolveAppServerServiceTier(args.metadata.serviceTier),
    cwd: args.worktreePath,
    approvalPolicy: args.metadata.approvalPolicy,
    approvalsReviewer: args.metadata.approvalsReviewer,
    sandbox: args.metadata.sandboxMode,
    config: {
      web_search: args.metadata.webSearch,
    },
    serviceName: "worktree-deck",
    baseInstructions: null,
    developerInstructions: null,
    personality: null,
    ephemeral: false,
    sessionStartSource: "startup",
    threadSource: "user",
    environments: null,
    dynamicTools: null,
    experimentalRawEvents: false,
    persistExtendedHistory: false,
  };
}

/**
 * app-server の turn/start payload を組み立てる
 */
export function buildCodexTurnStartParams(args: {
  threadId: string;
  initialPrompt: string;
  metadata: CodexInitialSessionMetadata;
}): JsonObject {
  return {
    threadId: args.threadId,
    input: [{ type: "text", text: args.initialPrompt, text_elements: [] }],
    model: args.metadata.model || null,
    serviceTier: resolveAppServerServiceTier(args.metadata.serviceTier),
    effort: args.metadata.reasoningEffort,
  };
}

/**
 * unknown を JSON object として扱えるか判定する
 */
function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * WebSocket の message payload を JSON object に変換する
 */
function parseJsonObject(value: unknown): JsonObject {
  const text = typeof value === "string" ? value : value instanceof Buffer ? value.toString("utf8") : "";
  if (!text) {
    return {};
  }
  const parsed = JSON.parse(text) as unknown;
  return isJsonObject(parsed) ? parsed : {};
}

/**
 * JSON-RPC error をユーザー向け文字列にする
 */
function formatJsonRpcError(error: JsonObject): string {
  const message = readString(error.message);
  if (message) {
    return message;
  }
  return "Codex app-server request failed.";
}

/**
 * unknown から文字列を読む
 */
function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * service tier を読む
 */
function readServiceTier(value: unknown): CodexServiceTier {
  const raw = readString(value);
  return raw === "fast" ? "fast" : "default";
}

/**
 * app-server に渡す service tier 値へ変換する
 */
function resolveAppServerServiceTier(value: CodexServiceTier): CodexServiceTier {
  return value === "fast" ? "fast" : "default";
}

/**
 * reasoning effort を読む
 */
function readReasoningEffort(value: unknown): CodexReasoningEffort {
  const raw = readString(value);
  if (raw === "low" || raw === "high" || raw === "xhigh") {
    return raw;
  }
  return "medium";
}

/**
 * approval policy を読む
 */
function readApprovalPolicy(value: unknown): CodexApprovalPolicy {
  const raw = readString(value);
  if (raw === "on-failure" || raw === "never") {
    return raw;
  }
  return "on-request";
}

/**
 * sandbox mode を読む
 */
function readSandboxMode(value: unknown): CodexSandboxMode {
  const raw = readString(value);
  if (raw === "read-only" || raw === "danger-full-access") {
    return raw;
  }
  return "workspace-write";
}

/**
 * approvals reviewer を読む
 */
function readApprovalsReviewer(value: unknown): CodexApprovalsReviewer {
  const raw = readString(value);
  if (raw === "auto_review" || raw === "guardian_subagent") {
    return raw;
  }
  return "user";
}

/**
 * web search mode を読む
 */
function readWebSearchMode(value: unknown): CodexWebSearchMode {
  const raw = readString(value);
  if (raw === "disabled" || raw === "live") {
    return raw;
  }
  return "cached";
}

/**
 * Codex global config のパスを返す
 */
function resolveCodexConfigPath(): string {
  const codexHome = process.env.CODEX_HOME?.trim() || `${homedir()}/.codex`;
  return `${codexHome}/config.toml`;
}

/**
 * top-level の key = "value" だけを読む簡易 TOML parser
 */
function parseTopLevelTomlStrings(source: string): Record<string, string> {
  const result: Record<string, string> = {};
  let inTable = false;
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    if (trimmed.startsWith("[")) {
      inTable = true;
      continue;
    }
    if (inTable) {
      continue;
    }
    const match = /^([A-Za-z0-9_.-]+)\s*=\s*"([^"]*)"/.exec(trimmed);
    if (match) {
      result[match[1] ?? ""] = match[2] ?? "";
    }
  }
  return result;
}

/**
 * 指定ミリ秒待機する
 */
async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
