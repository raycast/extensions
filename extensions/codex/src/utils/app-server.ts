import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { resolveCodexCliPath, shellCliCommand } from "./cli";
import { withConcurrency } from "./concurrency";
import { getErrorMessage as formatErrorMessage } from "./format";
import {
  type CodexThreadLatestMessages,
  type CodexThreadTurn,
  extractLatestThreadMessages,
  formatMessage,
  isAgentMessage,
  isUserMessage,
} from "./messages";
import { collectPaginatedEntries } from "./pagination";
import type { McpServerMap } from "./mcp-servers";
import { shellQuote } from "./shell";
import {
  type CodexThreadDescendants,
  getSpawnParentThreadId,
  partitionThreadDescendants,
} from "./threads";

const appServerArgs = ["app-server"];
const threadPageSize = 50;
const threadSearchFirstPageSize = 10;
const threadPreviewPageSize = 5;
const threadDescendantsPageSize = 50;
const threadPreviewMaxPages = 3;
const defaultRequestTimeoutMs = 30_000;
const threadPreviewMaxCharacters = 600;
const threadReadConcurrency = 12;

export const threadListMaxResults = 1000;
const allThreadSourceKinds = [
  "cli",
  "vscode",
  "exec",
  "appServer",
  "subAgent",
  "subAgentReview",
  "subAgentCompact",
  "subAgentThreadSpawn",
  "subAgentOther",
  "unknown",
] as const;
const allSourceKindsFilter = [...allThreadSourceKinds];

type InitializeParams = {
  clientInfo: {
    name: string;
    version: string;
  };
  capabilities: {
    experimentalApi: boolean;
  };
};

type ThreadListParams = {
  cursor?: string | null;
  limit?: number | null;
  sortKey?: "created_at" | "updated_at" | null;
  sortDirection?: "asc" | "desc" | null;
  modelProviders?: string[] | null;
  sourceKinds?: Array<(typeof allThreadSourceKinds)[number]> | null;
  archived?: boolean | null;
  cwd?: string | string[] | null;
  useStateDbOnly?: boolean;
  searchTerm?: string | null;
  parentThreadId?: string | null;
  ancestorThreadId?: string | null;
};

type ThreadSearchParams = {
  searchTerm: string;
  archived?: boolean | null;
  cursor?: string | null;
  limit?: number | null;
  sortKey?: "created_at" | "updated_at" | null;
  sortDirection?: "asc" | "desc" | null;
  sourceKinds?: Array<(typeof allThreadSourceKinds)[number]> | null;
};

type ThreadReadParams = {
  threadId: string;
  includeTurns?: boolean;
};

type ThreadForkParams = {
  threadId: string;
  excludeTurns?: boolean;
};

type SortDirection = "asc" | "desc";
type TurnItemsView = "notLoaded" | "summary" | "full";

type ThreadTurnsListParams = {
  threadId: string;
  cursor?: string | null;
  limit?: number | null;
  sortDirection?: SortDirection | null;
  itemsView?: TurnItemsView | null;
};

type ThreadSetNameParams = {
  threadId: string;
  name: string;
};

type ThreadIdParams = {
  threadId: string;
};

type EmptyResponse = Record<string, never>;

type InitializeResponse = {
  userAgent: string;
  codexHome: string;
  platformFamily: string;
  platformOs: string;
};

type ThreadListResponse = {
  data: CodexThread[];
  nextCursor: string | null;
  backwardsCursor: string | null;
};

type ThreadTurnsListResponse = {
  data: unknown[];
  nextCursor: string | null;
  backwardsCursor: string | null;
};

type ThreadSearchResponse = {
  data: Array<{
    thread: CodexThread;
    snippet: string | null;
  }>;
  nextCursor: string | null;
  backwardsCursor: string | null;
};

type ThreadResponse = {
  thread: CodexThread;
};

export type CodexConfigLayerSource = {
  type: string;
  file?: string;
  dotCodexFolder?: string;
  profile?: string | null;
  name?: string;
  id?: string;
  domain?: string;
  key?: string;
};

export type CodexConfigLayer = {
  name: CodexConfigLayerSource;
  version: string;
  config: unknown;
  disabledReason?: string | null;
};

export type CodexConfigReadResponse = {
  config: Record<string, unknown>;
  origins: Record<string, { name: CodexConfigLayerSource; version: string }>;
  layers: CodexConfigLayer[] | null;
};

export type McpServerRuntimeStatus =
  | "notStarted"
  | "starting"
  | "connected"
  | "authenticationRequired"
  | "failed"
  | "cancelled"
  | "disabled";

export type CodexMcpServerStatus = {
  name: string;
  authStatus:
    | "unknown"
    | "unsupported"
    | "notLoggedIn"
    | "bearerToken"
    | "oAuth";
  runtimeStatus?: McpServerRuntimeStatus | null;
  pluginId?: string | null;
  tools: Record<string, { name: string; title?: string | null }>;
  resources: Array<{ name: string; uri: string }>;
  resourceTemplates: Array<{ name: string; uriTemplate: string }>;
  serverInfo: {
    name: string;
    version: string;
    title?: string | null;
    description?: string | null;
    websiteUrl?: string | null;
  } | null;
};

type ConfigReadParams = {
  cwd?: string | null;
  includeLayers: boolean;
};

type ConfigBatchWriteParams = {
  edits: Array<{
    keyPath: string;
    mergeStrategy: "replace" | "upsert";
    value: unknown;
  }>;
  expectedVersion?: string | null;
  filePath?: string | null;
  reloadUserConfig: boolean;
};

export type ConfigWriteResponse = {
  filePath: string;
  status: "ok" | "okOverridden";
  version: string;
  overriddenMetadata?: unknown | null;
};

type ListMcpServerStatusParams = {
  cursor?: string | null;
  limit?: number | null;
  detail?: "full" | "toolsAndAuthOnly" | null;
  threadId?: string | null;
};

type ListMcpServerStatusResponse = {
  data: CodexMcpServerStatus[];
  nextCursor: string | null;
};

type McpServerOauthLoginParams = {
  name: string;
  scopes?: string[] | null;
  threadId?: string | null;
  timeoutSecs?: number | null;
};

type McpServerOauthLoginResponse = {
  authorizationUrl: string;
};

type CodexPlanType =
  | "free"
  | "go"
  | "plus"
  | "pro"
  | "prolite"
  | "team"
  | "self_serve_business_prolite"
  | "self_serve_business_usage_based"
  | "business"
  | "ent26"
  | "enterprise_cbp_automation"
  | "enterprise_cbp_usage_based"
  | "enterprise"
  | "edu"
  | "edu_plus"
  | "edu_pro"
  | "unknown";

export type CodexRateLimitWindow = {
  usedPercent: number;
  windowDurationMins: number | null;
  resetsAt: number | null;
};

export type CodexRateLimit = {
  limitId: string | null;
  limitName: string | null;
  primary: CodexRateLimitWindow | null;
  secondary: CodexRateLimitWindow | null;
  planType: CodexPlanType | null;
};

type CodexRateLimitsResponse = {
  rateLimits: CodexRateLimit;
  rateLimitsByLimitId: Record<string, CodexRateLimit | undefined> | null;
  rateLimitResetCredits: {
    availableCount: number;
    credits: Array<{
      status: "available" | "redeeming" | "redeemed" | "unknown";
      expiresAt: number | null;
      title: string | null;
    }> | null;
  } | null;
};

type CodexTokenUsageResponse = {
  summary: {
    lifetimeTokens: number | null;
    currentStreakDays: number | null;
  };
  dailyUsageBuckets: Array<{ startDate: string; tokens: number }> | null;
};

type AccountUsageReadParams = { threadId?: string | null } | null;

type AccountUsageReadResponse = CodexTokenUsageResponse;

export type CodexUsage = {
  rateLimits: CodexRateLimitsResponse;
  tokenUsage: CodexTokenUsageResponse;
};

type AppServerMethods = {
  initialize: { params: InitializeParams; result: InitializeResponse };
  "thread/list": { params: ThreadListParams; result: ThreadListResponse };
  "thread/search": {
    params: ThreadSearchParams;
    result: ThreadSearchResponse;
  };
  "thread/read": { params: ThreadReadParams; result: ThreadResponse };
  "thread/turns/list": {
    params: ThreadTurnsListParams;
    result: ThreadTurnsListResponse;
  };
  "thread/name/set": {
    params: ThreadSetNameParams;
    result: EmptyResponse;
  };
  "thread/fork": { params: ThreadForkParams; result: ThreadResponse };
  "thread/archive": {
    params: ThreadIdParams;
    result: EmptyResponse;
  };
  "thread/unarchive": {
    params: ThreadIdParams;
    result: ThreadResponse;
  };
  "config/read": {
    params: ConfigReadParams;
    result: CodexConfigReadResponse;
  };
  "config/batchWrite": {
    params: ConfigBatchWriteParams;
    result: ConfigWriteResponse;
  };
  "config/mcpServer/reload": {
    params: null;
    result: Record<string, never>;
  };
  "mcpServerStatus/list": {
    params: ListMcpServerStatusParams;
    result: ListMcpServerStatusResponse;
  };
  "mcpServer/oauth/login": {
    params: McpServerOauthLoginParams;
    result: McpServerOauthLoginResponse;
  };
  "account/rateLimits/read": {
    params: null;
    result: CodexRateLimitsResponse;
  };
  "account/usage/read": {
    params: AccountUsageReadParams;
    result: AccountUsageReadResponse;
  };
};

type RequestMethod = keyof AppServerMethods;

type PendingRequest = {
  method: RequestMethod;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeoutHandle: ReturnType<typeof setTimeout>;
};

type AppServerResultResponse = {
  id: string;
  result: unknown;
};

type AppServerErrorResponse = {
  id: string;
  error?: {
    message?: string;
    code?: number;
  };
};

export type CodexThreadStatus =
  | { type: "notLoaded" }
  | { type: "idle" }
  | { type: "systemError" }
  | {
      type: "active";
      activeFlags: Array<"waitingOnApproval" | "waitingOnUserInput">;
    };

export type CodexThreadSource =
  | "cli"
  | "vscode"
  | "exec"
  | "appServer"
  | "unknown"
  | { custom: string }
  | {
      subAgent:
        | "review"
        | "compact"
        | "memory_consolidation"
        | {
            thread_spawn: {
              parent_thread_id: string;
              depth: number;
              agent_path: string | null;
              agent_nickname: string | null;
              agent_role: string | null;
            };
          }
        | { other: string };
    };

export type CodexThread = {
  id: string;
  sessionId: string;
  forkedFromId: string | null;
  parentThreadId: string | null;
  canAcceptDirectInput: boolean | null;
  preview: string;
  ephemeral: boolean;
  modelProvider: string;
  model: string | null;
  reasoningEffort: string | null;
  createdAt: number;
  updatedAt: number;
  status: CodexThreadStatus;
  path: string | null;
  cwd: string;
  cliVersion: string;
  source: CodexThreadSource;
  agentNickname: string | null;
  agentRole: string | null;
  gitInfo: {
    sha: string | null;
    branch: string | null;
    originUrl: string | null;
  } | null;
  name: string | null;
  turns: CodexThreadTurn[];
};

export type { CodexThreadLatestMessages } from "./messages";

export type CodexThreadSearchHit = {
  thread: CodexThread;
  snippet: string | null;
};

export type CodexThreadConversationMessage = {
  role: "user" | "agent";
  text: string;
  timestamp?: number;
};

type ForkThreadResult = {
  thread: CodexThread;
  renameWarning?: string;
};

type CodexThreadConversation = {
  messages: CodexThreadConversationMessage[];
  turnCount: number;
};

type ListThreadsOptions = {
  archived: boolean;
  cwd?: string | null;
  maxResults?: number;
  signal?: AbortSignal;
};

type SearchThreadsOptions = {
  archived: boolean;
  maxResults?: number;
};

type SearchThreadsRuntimeOptions = {
  signal?: AbortSignal;
  onPage?: (hits: readonly CodexThreadSearchHit[]) => void;
};

type SetThreadNameOptions = {
  archived?: boolean;
};

export type SetThreadNameResult =
  | {
      strategy: "direct";
    }
  | {
      strategy: "archivedFallback";
      directError: string;
    };

class CodexAppServerRequestError extends Error {
  readonly code: number | undefined;
  readonly method: RequestMethod;

  constructor(method: RequestMethod, message: string, code?: number) {
    super(message);
    this.name = "CodexAppServerRequestError";
    this.method = method;
    this.code = code;
  }
}

type CodexMcpOauthLoginCompletedNotification = {
  method: "mcpServer/oauthLogin/completed";
  params: { name: string; success: boolean; error: string | null };
};

class CodexAppServerSession {
  private readonly child: ChildProcessWithoutNullStreams;
  private readonly pendingRequests = new Map<string, PendingRequest>();
  private readonly stderrLines: string[] = [];
  private stdoutBuffer = "";
  private nextRequestId = 1;
  private hasExited = false;
  private oauthLoginCompletion?: {
    name: string;
    resolve: () => void;
    reject: (error: Error) => void;
  };

  constructor(codexPath: string) {
    this.child = spawn(codexPath, appServerArgs, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.child.stdout.setEncoding("utf8");
    this.child.stderr.setEncoding("utf8");

    this.child.stdout.on("data", (chunk: string) => {
      this.stdoutBuffer += chunk;
      this.flushStdoutBuffer();
    });

    this.child.stderr.on("data", (chunk: string) => {
      for (const line of chunk.split(/\r?\n/)) {
        const trimmedLine = line.trim();
        if (!trimmedLine) {
          continue;
        }

        this.stderrLines.push(trimmedLine);
        if (this.stderrLines.length > 20) {
          this.stderrLines.shift();
        }
      }
    });

    this.child.on("exit", (code, signal) => {
      this.hasExited = true;

      const detail = this.stderrLines[this.stderrLines.length - 1];
      const message = detail
        ? `Codex app-server exited unexpectedly (${code ?? signal ?? "unknown"}): ${detail}`
        : `Codex app-server exited unexpectedly (${code ?? signal ?? "unknown"})`;

      this.rejectPendingRequests(new Error(message));
    });

    this.child.on("error", (error) => {
      this.hasExited = true;
      this.rejectPendingRequests(error);
    });

    // A closed pipe surfaces on the stdin stream, not the child. Unhandled, it
    // would throw out of the command instead of failing the request.
    this.child.stdin.on("error", (error) => {
      this.rejectPendingRequests(error);
      void this.dispose();
    });
  }

  private rejectPendingRequests(error: Error) {
    this.oauthLoginCompletion?.reject(error);
    for (const pendingRequest of this.pendingRequests.values()) {
      clearTimeout(pendingRequest.timeoutHandle);
      pendingRequest.reject(error);
    }

    this.pendingRequests.clear();
  }

  async initialize(): Promise<InitializeResponse> {
    const response = await this.request("initialize", {
      clientInfo: {
        name: "raycast-codex",
        // Protocol client version, not the npm package version.
        version: "1.0.0",
      },
      capabilities: {
        experimentalApi: true,
      },
    });

    this.child.stdin.write(JSON.stringify({ method: "initialized" }) + "\n");

    return response;
  }

  async request<Method extends keyof AppServerMethods>(
    method: Method,
    params: AppServerMethods[Method]["params"],
    options?: { timeoutMs?: number },
  ): Promise<AppServerMethods[Method]["result"]> {
    if (this.hasExited) {
      throw new Error("Codex app-server is not running");
    }

    const requestId = String(this.nextRequestId++);
    const timeoutMs = options?.timeoutMs ?? defaultRequestTimeoutMs;
    const payload = JSON.stringify({ method, id: requestId, params });

    const responsePromise = new Promise<AppServerMethods[Method]["result"]>(
      (resolve, reject) => {
        const timeoutHandle = setTimeout(() => {
          if (this.pendingRequests.delete(requestId)) {
            reject(
              new Error(
                `codex app-server request "${method}" timed out after ${timeoutMs}ms`,
              ),
            );
            // Dispose the session: a hung server is unlikely to recover.
            void this.dispose();
          }
        }, timeoutMs);

        this.pendingRequests.set(requestId, {
          method,
          resolve: (value) => {
            resolve(value as AppServerMethods[Method]["result"]);
          },
          reject,
          timeoutHandle,
        });
      },
    );

    this.child.stdin.write(payload + "\n");

    return responsePromise;
  }

  waitForMcpOauthLogin(name: string, timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.oauthLoginCompletion?.reject(new Error("MCP sign-in timed out"));
      }, timeoutMs);
      const cleanup = () => {
        clearTimeout(timeout);
        this.oauthLoginCompletion = undefined;
      };
      this.oauthLoginCompletion = {
        name,
        resolve: () => {
          cleanup();
          resolve();
        },
        reject: (error) => {
          cleanup();
          reject(error);
        },
      };
    });
  }

  async dispose(): Promise<void> {
    if (this.hasExited) {
      return;
    }

    this.rejectPendingRequests(new Error("codex app-server session disposed"));

    this.child.kill("SIGTERM");

    await new Promise<void>((resolve) => {
      // Escalate when the server ignores SIGTERM so no process is left behind.
      const timeout = setTimeout(() => {
        this.child.kill("SIGKILL");
        resolve();
      }, 250);

      this.child.once("exit", () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  private flushStdoutBuffer() {
    const lines = this.stdoutBuffer.split(/\r?\n/);
    this.stdoutBuffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) {
        continue;
      }

      this.handleStdoutLine(trimmedLine);
    }
  }

  private handleStdoutLine(line: string) {
    let message:
      | AppServerErrorResponse
      | AppServerResultResponse
      | CodexMcpOauthLoginCompletedNotification;

    try {
      message = JSON.parse(line) as
        | AppServerErrorResponse
        | AppServerResultResponse
        | CodexMcpOauthLoginCompletedNotification;
    } catch {
      return;
    }

    if ("method" in message) {
      if (message.method === "mcpServer/oauthLogin/completed") {
        const waiter = this.oauthLoginCompletion;
        if (waiter?.name === message.params.name) {
          if (message.params.success) waiter.resolve();
          else
            waiter.reject(
              new Error(message.params.error ?? "MCP sign-in failed"),
            );
        }
      }
      return;
    }

    const pendingRequest = this.pendingRequests.get(message.id);
    if (!pendingRequest) {
      return;
    }

    this.pendingRequests.delete(message.id);
    clearTimeout(pendingRequest.timeoutHandle);

    if ("error" in message && message.error) {
      pendingRequest.reject(
        new CodexAppServerRequestError(
          pendingRequest.method,
          message.error.message ?? "Codex app-server request failed",
          message.error.code,
        ),
      );
      return;
    }

    if ("result" in message) {
      pendingRequest.resolve(message.result);
      return;
    }

    pendingRequest.reject(
      new Error("Codex app-server returned an invalid response"),
    );
  }
}

async function withCodexAppServerSession<T>(
  work: (
    session: CodexAppServerSession,
    initializeResponse: InitializeResponse,
  ) => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  signal?.throwIfAborted();
  const codexCliPath = await resolveCodexCliPath();
  // The abort listener is not attached yet, so an abort during CLI discovery
  // would otherwise still spawn a process.
  signal?.throwIfAborted();
  const session = new CodexAppServerSession(codexCliPath);
  // Disposing the session on abort rejects the in-flight request so superseded
  // work stops its Codex process instead of running to the end.
  const onAbort = () => {
    void session.dispose();
  };
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const initializeResponse = await session.initialize();
    return await work(session, initializeResponse);
  } catch (error) {
    // The abort listener disposes the session mid-request; surface the abort
    // rather than the generic disposal error.
    signal?.throwIfAborted();
    throw error;
  } finally {
    signal?.removeEventListener("abort", onAbort);
    await session.dispose();
  }
}

let codexHomeResolution: Promise<string> | undefined;

// The Codex home folder cannot change while a command is running, so the
// spawn-handshake-kill round trip is paid at most once per command run.
export async function getCodexHome(): Promise<string> {
  codexHomeResolution ??= withCodexAppServerSession(
    async (_session, initializeResponse) => initializeResponse.codexHome,
  ).catch((error: unknown) => {
    codexHomeResolution = undefined;
    throw error;
  });

  return codexHomeResolution;
}

export async function readMcpConfiguration(
  cwd?: string | null,
  signal?: AbortSignal,
): Promise<CodexConfigReadResponse> {
  return withCodexAppServerSession(
    (session) =>
      session.request("config/read", { cwd: cwd ?? null, includeLayers: true }),
    signal,
  );
}

export async function listMcpServerStatuses(
  signal?: AbortSignal,
): Promise<CodexMcpServerStatus[]> {
  return withCodexAppServerSession(
    (session) =>
      collectPaginatedEntries({
        requestPage: (cursor) => {
          signal?.throwIfAborted();
          return session.request("mcpServerStatus/list", {
            cursor,
            detail: "full",
          });
        },
        isEntry: isMcpServerStatusEntry,
        description: "mcpServerStatus/list",
      }),
    signal,
  );
}

function isMcpServerStatusEntry(value: unknown): value is CodexMcpServerStatus {
  return isRecord(value) && typeof value.name === "string";
}

export async function writeMcpServerMap(
  {
    filePath,
    expectedVersion,
    mcpServers,
  }: { filePath: string; expectedVersion: string; mcpServers: McpServerMap },
  signal?: AbortSignal,
): Promise<ConfigWriteResponse> {
  return withCodexAppServerSession(
    (session) =>
      session.request("config/batchWrite", {
        edits: [
          {
            keyPath: "mcp_servers",
            mergeStrategy: "replace",
            value: mcpServers,
          },
        ],
        expectedVersion,
        filePath,
        reloadUserConfig: true,
      }),
    signal,
  );
}

export async function reloadMcpServers(signal?: AbortSignal): Promise<void> {
  await withCodexAppServerSession(
    (session) => session.request("config/mcpServer/reload", null),
    signal,
  );
}

export async function startMcpOauthLogin(
  name: string,
  onAuthorizationUrl: (url: string) => Promise<void>,
  scopes?: string[],
  signal?: AbortSignal,
): Promise<void> {
  await withCodexAppServerSession(async (session) => {
    // Register before requesting the URL so a fast completion cannot be lost.
    const completed = session.waitForMcpOauthLogin(name, 150_000);
    await Promise.all([
      completed,
      session
        .request("mcpServer/oauth/login", {
          name,
          scopes: scopes?.length ? scopes : null,
          timeoutSecs: 120,
        })
        .then((response) => onAuthorizationUrl(response.authorizationUrl)),
    ]);
  }, signal);
}

export async function readCodexUsage(
  signal?: AbortSignal,
): Promise<CodexUsage> {
  return withCodexAppServerSession(async (session) => {
    const [rateLimits, tokenUsage] = await Promise.all([
      session.request("account/rateLimits/read", null),
      session.request("account/usage/read", null),
    ]);
    return { rateLimits, tokenUsage };
  }, signal);
}

function isListedThreadEntry(value: unknown): value is CodexThread {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.updatedAt === "number"
  );
}

export type ReadThreadsResult = {
  threads: CodexThread[];
  unavailableThreadIds: string[];
};

type ReadThreadOutcome =
  | { thread: CodexThread }
  | { unavailableThreadId: string };

export async function readThreads(
  threadIds: string[],
  signal?: AbortSignal,
): Promise<ReadThreadsResult> {
  const uniqueThreadIds = Array.from(
    new Set(threadIds.map((threadId) => threadId.trim()).filter(Boolean)),
  );

  if (uniqueThreadIds.length === 0) {
    return { threads: [], unavailableThreadIds: [] };
  }

  return withCodexAppServerSession(async (session) => {
    const outcomes = await withConcurrency<string, ReadThreadOutcome>(
      uniqueThreadIds,
      threadReadConcurrency,
      async (threadId) => {
        signal?.throwIfAborted();
        try {
          const response = await session.request("thread/read", {
            threadId,
            includeTurns: false,
          });
          return { thread: normalizeListedThread(response.thread) };
        } catch (error) {
          signal?.throwIfAborted();
          if (isThreadNotFoundError(error, threadId)) {
            return { unavailableThreadId: threadId };
          }
          throw error;
        }
      },
    );

    const threads = outcomes.flatMap((outcome) =>
      "thread" in outcome ? [outcome.thread] : [],
    );
    const unavailableThreadIds = outcomes.flatMap((outcome) =>
      "unavailableThreadId" in outcome ? [outcome.unavailableThreadId] : [],
    );

    threads.sort((left, right) => right.updatedAt - left.updatedAt);
    return { threads, unavailableThreadIds };
  }, signal);
}

export async function listThreads({
  archived,
  cwd,
  maxResults = threadListMaxResults,
  signal,
}: ListThreadsOptions): Promise<CodexThread[]> {
  const maxThreadCount = Math.max(0, maxResults);
  if (maxThreadCount === 0) {
    return [];
  }

  return withCodexAppServerSession(async (session) => {
    const threadsById = new Map<string, CodexThread>();

    await collectPaginatedEntries({
      requestPage: (cursor) => {
        signal?.throwIfAborted();
        return session.request("thread/list", {
          archived,
          cursor,
          limit: Math.min(threadPageSize, maxThreadCount - threadsById.size),
          sortKey: "updated_at",
          sortDirection: "desc",
          sourceKinds: allSourceKindsFilter,
          cwd: cwd ?? null,
          useStateDbOnly: true,
        });
      },
      isEntry: isListedThreadEntry,
      description: "thread/list",
      onPage: (page) => {
        for (const thread of page) {
          const normalizedThread = normalizeListedThread(thread);
          const existingThread = threadsById.get(normalizedThread.id);
          if (
            !existingThread ||
            normalizedThread.updatedAt > existingThread.updatedAt
          ) {
            threadsById.set(normalizedThread.id, normalizedThread);
          }
        }
      },
      shouldStop: () => threadsById.size >= maxThreadCount,
    });

    return Array.from(threadsById.values())
      .slice(0, maxThreadCount)
      .sort((left, right) => right.updatedAt - left.updatedAt);
  }, signal);
}

export async function listThreadDescendants(
  threadId: string,
  archived: boolean,
  options?: { signal?: AbortSignal },
): Promise<CodexThreadDescendants> {
  const signal = options?.signal;

  return withCodexAppServerSession(async (session) => {
    const entries = await collectPaginatedEntries({
      requestPage: (cursor) => {
        signal?.throwIfAborted();
        return session.request("thread/list", {
          ancestorThreadId: threadId,
          archived,
          cursor,
          limit: threadDescendantsPageSize,
          sortKey: "updated_at",
          sortDirection: "desc",
          sourceKinds: allSourceKindsFilter,
          useStateDbOnly: true,
        });
      },
      isEntry: isListedThreadEntry,
      description: "thread/list descendants",
    });

    return partitionThreadDescendants(
      threadId,
      entries.map(normalizeListedThread),
    );
  }, signal);
}

export async function searchThreads(
  searchTerm: string,
  { archived, maxResults = threadListMaxResults }: SearchThreadsOptions,
  { signal, onPage }: SearchThreadsRuntimeOptions = {},
): Promise<CodexThreadSearchHit[]> {
  const query = searchTerm.trim();
  const maxThreadCount = Math.max(0, maxResults);
  if (!query || maxThreadCount === 0) {
    return [];
  }

  return withCodexAppServerSession(async (session) => {
    const entries = await collectPaginatedEntries({
      requestPage: (cursor) => {
        signal?.throwIfAborted();
        return session.request("thread/search", {
          searchTerm: query,
          archived,
          cursor,
          limit: cursor
            ? threadPageSize
            : Math.min(threadSearchFirstPageSize, maxThreadCount),
          sortKey: "updated_at",
          sortDirection: "desc",
          sourceKinds: allSourceKindsFilter,
        });
      },
      isEntry: isThreadSearchEntry,
      description: "thread/search",
      maxPages:
        maxThreadCount <= threadSearchFirstPageSize
          ? 1
          : 1 +
            Math.ceil(
              (maxThreadCount - threadSearchFirstPageSize) / threadPageSize,
            ),
      onPage: (_pageEntries, accumulatedEntries) =>
        onPage?.(normalizeThreadSearchHits(accumulatedEntries, maxThreadCount)),
    });

    return normalizeThreadSearchHits(entries, maxThreadCount);
  }, signal);
}

type ThreadSearchEntry = ThreadSearchResponse["data"][number];

function isThreadSearchEntry(value: unknown): value is ThreadSearchEntry {
  return (
    isRecord(value) &&
    isRecord(value.thread) &&
    typeof value.thread.id === "string" &&
    (value.snippet === null || typeof value.snippet === "string")
  );
}

function normalizeThreadSearchHits(
  entries: readonly ThreadSearchEntry[],
  maxResults: number,
): CodexThreadSearchHit[] {
  const hitsByThreadId = new Map<string, CodexThreadSearchHit>();

  for (const { thread, snippet } of entries) {
    const existingHit = hitsByThreadId.get(thread.id);
    if (!existingHit || thread.updatedAt > existingHit.thread.updatedAt) {
      hitsByThreadId.set(thread.id, {
        thread: normalizeListedThread(thread),
        snippet,
      });
    }
  }

  return Array.from(hitsByThreadId.values()).slice(0, maxResults);
}

function normalizeListedThread(thread: CodexThread): CodexThread {
  return {
    id: thread.id,
    sessionId: thread.sessionId ?? "",
    forkedFromId: thread.forkedFromId,
    parentThreadId:
      thread.parentThreadId ?? getSpawnParentThreadId(thread.source),
    canAcceptDirectInput: thread.canAcceptDirectInput ?? null,
    preview: truncateThreadPreview(thread.preview),
    ephemeral: thread.ephemeral,
    modelProvider: thread.modelProvider,
    model: thread.model ?? null,
    reasoningEffort: thread.reasoningEffort ?? null,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    status: thread.status,
    path: thread.path,
    cwd: thread.cwd,
    cliVersion: thread.cliVersion,
    source: thread.source,
    agentNickname: thread.agentNickname,
    agentRole: thread.agentRole,
    gitInfo: thread.gitInfo
      ? {
          sha: thread.gitInfo.sha,
          branch: thread.gitInfo.branch,
          originUrl: thread.gitInfo.originUrl,
        }
      : null,
    name: thread.name,
    turns: [],
  };
}

function truncateThreadPreview(preview: string): string {
  const normalizedPreview = preview.replace(/\s+/g, " ").trim();
  if (normalizedPreview.length <= threadPreviewMaxCharacters) {
    return normalizedPreview;
  }

  return `${normalizedPreview.slice(0, threadPreviewMaxCharacters).trimEnd()}...`;
}

export async function forkThread(
  threadId: string,
  name: string,
): Promise<ForkThreadResult> {
  return withCodexAppServerSession(async (session) => {
    const response = await session.request("thread/fork", {
      threadId,
      excludeTurns: true,
    });

    try {
      await session.request("thread/name/set", {
        threadId: response.thread.id,
        name,
      });

      return { thread: { ...response.thread, name } };
    } catch (error) {
      return {
        thread: response.thread,
        renameWarning: getErrorMessage(error),
      };
    }
  });
}

export async function readLatestThreadMessages(
  threadId: string,
): Promise<CodexThreadLatestMessages> {
  return withCodexAppServerSession(async (session) => {
    const turns = await listThreadTurnSummaries(session, threadId, {
      limit: threadPreviewPageSize,
      maxPages: threadPreviewMaxPages,
      sortDirection: "desc",
      shouldStop: (entries) => {
        const messages = extractLatestThreadMessages(entries);
        return Boolean(messages.lastUserMessage && messages.lastAgentMessage);
      },
    });

    return extractLatestThreadMessages(turns);
  });
}

function isAppServerThreadTurn(value: unknown): value is CodexThreadTurn {
  return isRecord(value) && typeof value.id === "string";
}

async function listThreadTurnSummaries(
  session: CodexAppServerSession,
  threadId: string,
  options: {
    limit: number;
    sortDirection: SortDirection;
    maxPages?: number;
    shouldStop?: (turns: readonly CodexThreadTurn[]) => boolean;
  },
): Promise<CodexThreadTurn[]> {
  return collectPaginatedEntries({
    requestPage: (cursor) =>
      session.request("thread/turns/list", {
        threadId,
        cursor,
        limit: options.limit,
        sortDirection: options.sortDirection,
        itemsView: "summary",
      }),
    isEntry: isAppServerThreadTurnSummary,
    description: `thread/turns/list summary for thread ${threadId}`,
    maxPages: options.maxPages,
    shouldStop: options.shouldStop,
  });
}

function isAppServerThreadTurnSummary(
  value: unknown,
): value is CodexThreadTurn {
  return (
    isAppServerThreadTurn(value) &&
    "items" in value &&
    Array.isArray(value.items)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function readThreadConversation(
  threadId: string,
): Promise<CodexThreadConversation> {
  return withCodexAppServerSession(async (session) => {
    const turns = await listThreadTurnSummaries(session, threadId, {
      limit: threadPageSize,
      sortDirection: "asc",
    });

    return extractThreadConversation(turns);
  });
}

export async function setThreadName(
  threadId: string,
  name: string,
  options: SetThreadNameOptions = {},
): Promise<SetThreadNameResult> {
  try {
    await setThreadNameInCurrentScope(threadId, name);
    return { strategy: "direct" };
  } catch (error) {
    if (!options.archived || !isThreadNotFoundError(error, threadId)) {
      throw error;
    }

    return setArchivedThreadName(threadId, name, error);
  }
}

async function setThreadNameInCurrentScope(
  threadId: string,
  name: string,
): Promise<void> {
  await withCodexAppServerSession(async (session) => {
    await session.request("thread/name/set", {
      threadId,
      name,
    });
  });
}

// Runs unarchive -> rename -> re-archive in a single session to avoid 3 spawns.
async function setArchivedThreadName(
  threadId: string,
  name: string,
  directError: unknown,
): Promise<SetThreadNameResult> {
  return withCodexAppServerSession(async (session) => {
    try {
      await session.request("thread/unarchive", {
        threadId,
      });
    } catch (error) {
      throw buildArchivedRenameFallbackError(
        threadId,
        "unarchive",
        directError,
        error,
      );
    }

    let renameError: unknown;
    try {
      await session.request("thread/name/set", {
        threadId,
        name,
      });
    } catch (error) {
      renameError = error;
    }

    try {
      await session.request("thread/archive", {
        threadId,
      });
    } catch (archiveError) {
      if (renameError) {
        throw buildArchivedRenameFallbackError(
          threadId,
          "rename and re-archive",
          directError,
          renameError,
          archiveError,
        );
      }

      throw buildArchivedRenameFallbackError(
        threadId,
        "re-archive",
        directError,
        archiveError,
      );
    }

    if (renameError) {
      throw buildArchivedRenameFallbackError(
        threadId,
        "rename",
        directError,
        renameError,
      );
    }

    return {
      strategy: "archivedFallback",
      directError: getErrorMessage(directError),
    };
  });
}

export async function archiveThread(threadId: string): Promise<void> {
  await withCodexAppServerSession(async (session) => {
    await session.request("thread/archive", {
      threadId,
    });
  });
}

export async function unarchiveThread(threadId: string): Promise<CodexThread> {
  return withCodexAppServerSession(async (session) => {
    const response = await session.request("thread/unarchive", { threadId });
    return response.thread;
  });
}

export function buildResumeCommand(threadId: string): string {
  return `${shellQuote(shellCliCommand())} resume ${shellQuote(threadId)}`;
}

const threadNotFoundPhrases = [
  "thread not found",
  "thread not loaded",
  "no rollout found for thread id",
  "no archived rollout found for thread id",
];

function isThreadNotFoundError(error: unknown, threadId: string): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes(threadId.toLowerCase()) &&
    threadNotFoundPhrases.some((phrase) => message.includes(phrase))
  );
}

function buildArchivedRenameFallbackError(
  threadId: string,
  failedStep: string,
  directError: unknown,
  fallbackError: unknown,
  restoreError?: unknown,
): Error {
  const restoreDetail = restoreError
    ? `; re-archive also failed: ${getErrorMessage(restoreError)}`
    : "";
  return new Error(
    `Archived rename fallback failed for ${threadId} during ${failedStep}. Direct thread/name/set error: ${getErrorMessage(
      directError,
    )}. Fallback error: ${getErrorMessage(fallbackError)}${restoreDetail}`,
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof CodexAppServerRequestError) {
    const code =
      error.code === undefined ? "" : ` (${error.method}, code ${error.code})`;
    return `${error.message}${code}`;
  }

  return formatErrorMessage(error);
}

function extractThreadConversation(
  turns: Array<{ items: unknown[]; startedAt?: number | null }>,
): CodexThreadConversation {
  const messages: CodexThreadConversationMessage[] = [];

  for (const turn of turns) {
    const timestamp =
      typeof turn.startedAt === "number" ? turn.startedAt : undefined;

    for (const item of turn.items) {
      if (isUserMessage(item)) {
        const text = formatMessage(item.content);
        if (text) {
          messages.push({ role: "user", text, timestamp });
        }
        continue;
      }

      if (isAgentMessage(item)) {
        const text = item.text.trim();
        if (text) {
          messages.push({ role: "agent", text, timestamp });
        }
      }
    }
  }

  return {
    messages,
    turnCount: turns.length,
  };
}
