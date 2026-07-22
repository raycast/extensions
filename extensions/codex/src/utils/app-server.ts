import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { resolveCodexCliPath, shellCliCommand } from "./cli";
import {
  type CodexThreadLatestMessages,
  type CodexThreadTurn,
  extractLatestThreadMessages,
  formatMessage,
  isAgentMessage,
  isUserMessage,
} from "./messages";
import { shellQuote } from "./shell";

const appServerArgs = ["app-server"];
const threadPageSize = 50;
const defaultRequestTimeoutMs = 30_000;
const secondsPerDay = 24 * 60 * 60;
const threadPreviewMaxCharacters = 600;

export const threadListLookbackDays = 30;
export const threadListMaxResults = 500;
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

type ThreadForkParams = {
  threadId: string;
  excludeTurns?: boolean;
};

type ThreadReadParams = {
  threadId: string;
  includeTurns: boolean;
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

type ThreadItemsListParams = {
  threadId: string;
  turnId?: string | null;
  cursor?: string | null;
  limit?: number | null;
  sortDirection?: SortDirection | null;
};

type ThreadSetNameParams = {
  threadId: string;
  name: string;
};

type ThreadArchiveParams = {
  threadId: string;
};

type ThreadArchiveResponse = Record<string, never>;

type ThreadUnarchiveParams = {
  threadId: string;
};

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

type ThreadReadResponse = {
  thread: CodexThread;
};

type ThreadTurnsListResponse = {
  data: unknown[];
  nextCursor: string | null;
  backwardsCursor: string | null;
};

type ThreadItemEntry = {
  turnId: string;
  item: unknown;
};

type ThreadItemsListResponse = {
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

type ThreadForkResponse = {
  thread: CodexThread;
};

type ThreadSetNameResponse = Record<string, never>;

type ThreadUnarchiveResponse = {
  thread: CodexThread;
};

type AppServerMethods = {
  initialize: { params: InitializeParams; result: InitializeResponse };
  "thread/list": { params: ThreadListParams; result: ThreadListResponse };
  "thread/search": {
    params: ThreadSearchParams;
    result: ThreadSearchResponse;
  };
  "thread/read": { params: ThreadReadParams; result: ThreadReadResponse };
  "thread/turns/list": {
    params: ThreadTurnsListParams;
    result: ThreadTurnsListResponse;
  };
  "thread/items/list": {
    params: ThreadItemsListParams;
    result: ThreadItemsListResponse;
  };
  "thread/name/set": {
    params: ThreadSetNameParams;
    result: ThreadSetNameResponse;
  };
  "thread/fork": { params: ThreadForkParams; result: ThreadForkResponse };
  "thread/archive": {
    params: ThreadArchiveParams;
    result: ThreadArchiveResponse;
  };
  "thread/unarchive": {
    params: ThreadUnarchiveParams;
    result: ThreadUnarchiveResponse;
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
  forkedFromId: string | null;
  preview: string;
  ephemeral: boolean;
  modelProvider: string;
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
  threadId: string;
  snippet: string | null;
};

export type CodexThreadConversationMessage = {
  role: "user" | "agent";
  text: string;
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
  windowDays?: number;
};

type SearchThreadsOptions = {
  archived: boolean;
  maxResults?: number;
  windowDays?: number;
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

class CodexAppServerSession {
  private readonly child: ChildProcessWithoutNullStreams;
  private readonly pendingRequests = new Map<string, PendingRequest>();
  private readonly stderrLines: string[] = [];
  private stdoutBuffer = "";
  private nextRequestId = 1;
  private hasExited = false;

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

      for (const pendingRequest of this.pendingRequests.values()) {
        clearTimeout(pendingRequest.timeoutHandle);
        pendingRequest.reject(new Error(message));
      }

      this.pendingRequests.clear();
    });

    this.child.on("error", (error) => {
      this.hasExited = true;

      for (const pendingRequest of this.pendingRequests.values()) {
        clearTimeout(pendingRequest.timeoutHandle);
        pendingRequest.reject(error);
      }

      this.pendingRequests.clear();
    });
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

  async dispose(): Promise<void> {
    if (this.hasExited) {
      return;
    }

    for (const pendingRequest of this.pendingRequests.values()) {
      clearTimeout(pendingRequest.timeoutHandle);
      pendingRequest.reject(new Error("codex app-server session disposed"));
    }
    this.pendingRequests.clear();

    this.child.kill("SIGTERM");

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, 250);

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
    let message: AppServerErrorResponse | AppServerResultResponse;

    try {
      message = JSON.parse(line) as
        | AppServerErrorResponse
        | AppServerResultResponse;
    } catch {
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
  work: (session: CodexAppServerSession) => Promise<T>,
): Promise<T> {
  const session = new CodexAppServerSession(await resolveCodexCliPath());

  try {
    await session.initialize();
    return await work(session);
  } finally {
    await session.dispose();
  }
}

export async function listThreads({
  archived,
  cwd,
  maxResults = threadListMaxResults,
  windowDays = threadListLookbackDays,
}: ListThreadsOptions): Promise<CodexThread[]> {
  return withCodexAppServerSession(async (session) => {
    const threads: CodexThread[] = [];
    let cursor: string | null = null;
    let didReachThreadListWindowEnd = false;
    const maxThreadCount = Math.max(0, maxResults);
    const minUpdatedAt = getThreadListCutoffSeconds(windowDays);

    if (maxThreadCount === 0) {
      return [];
    }

    do {
      const pageLimit = Math.min(
        threadPageSize,
        maxThreadCount - threads.length,
      );
      const response: ThreadListResponse = await session.request(
        "thread/list",
        {
          archived,
          cursor,
          limit: pageLimit,
          sortKey: "updated_at",
          sortDirection: "desc",
          sourceKinds: [...allThreadSourceKinds],
          cwd: cwd ?? null,
        },
      );

      threads.push(
        ...response.data
          .filter((thread) => thread.updatedAt >= minUpdatedAt)
          .map((thread) => normalizeListedThread(thread)),
      );
      cursor = response.nextCursor;
      didReachThreadListWindowEnd = isPastThreadListWindow(
        response.data,
        minUpdatedAt,
      );
    } while (
      cursor &&
      threads.length < maxThreadCount &&
      !didReachThreadListWindowEnd
    );

    return threads
      .slice(0, maxThreadCount)
      .sort((left, right) => right.updatedAt - left.updatedAt);
  });
}

export async function searchThreads(
  searchTerm: string,
  {
    archived,
    maxResults = threadListMaxResults,
    windowDays = threadListLookbackDays,
  }: SearchThreadsOptions,
  signal?: AbortSignal,
): Promise<CodexThreadSearchHit[]> {
  const query = searchTerm.trim();
  const maxThreadCount = Math.max(0, maxResults);
  if (!query || maxThreadCount === 0) {
    return [];
  }

  return withCodexAppServerSession(async (session) => {
    signal?.throwIfAborted();
    // Disposing the session on abort rejects the in-flight request so a
    // superseded search stops its Codex process instead of running to the end.
    const onAbort = () => {
      void session.dispose();
    };
    signal?.addEventListener("abort", onAbort, { once: true });

    try {
      const hits: CodexThreadSearchHit[] = [];
      const minUpdatedAt = getThreadListCutoffSeconds(windowDays);
      let cursor: string | null = null;
      let reachedWindowEnd = false;

      do {
        let response: ThreadSearchResponse;
        try {
          response = await session.request("thread/search", {
            searchTerm: query,
            archived,
            cursor,
            limit: Math.min(threadPageSize, maxThreadCount - hits.length),
            sortKey: "updated_at",
            sortDirection: "desc",
            sourceKinds: [...allThreadSourceKinds],
          });
        } catch (error) {
          // The abort listener disposes the session mid-request; surface the
          // abort rather than the generic disposal error.
          signal?.throwIfAborted();
          throw error;
        }

        hits.push(
          ...response.data
            .filter(({ thread }) => thread.updatedAt >= minUpdatedAt)
            .map(({ thread, snippet }) => ({
              threadId: thread.id,
              snippet,
            })),
        );
        cursor = response.nextCursor;
        reachedWindowEnd = isPastThreadListWindow(
          response.data.map(({ thread }) => thread),
          minUpdatedAt,
        );
      } while (cursor && hits.length < maxThreadCount && !reachedWindowEnd);

      return hits.slice(0, maxThreadCount);
    } finally {
      signal?.removeEventListener("abort", onAbort);
    }
  });
}

function getThreadListCutoffSeconds(windowDays: number): number {
  return (
    Math.floor(Date.now() / 1000) - Math.max(0, windowDays) * secondsPerDay
  );
}

function isPastThreadListWindow(
  threads: CodexThread[],
  minUpdatedAt: number,
): boolean {
  return threads.some((thread) => thread.updatedAt < minUpdatedAt);
}

function normalizeListedThread(thread: CodexThread): CodexThread {
  return {
    id: thread.id,
    forkedFromId: thread.forkedFromId,
    preview: truncateThreadPreview(thread.preview),
    ephemeral: thread.ephemeral,
    modelProvider: thread.modelProvider,
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
  const thread = await readThread(threadId);
  return extractLatestThreadMessages([...thread.turns].reverse());
}

export async function readThread(threadId: string): Promise<CodexThread> {
  return withCodexAppServerSession(async (session) => {
    try {
      const response = await session.request("thread/read", {
        threadId,
        includeTurns: true,
      });
      return getThreadFromReadResponse(response, threadId);
    } catch (error) {
      // Threads stored in Codex's paginated history format reject an inline
      // read; assemble them from the paged endpoints instead. Any other error
      // is a genuine failure and propagates unchanged.
      if (!isPaginatedHistoryError(error)) {
        throw error;
      }
      return readPaginatedThread(session, threadId);
    }
  });
}

function getThreadFromReadResponse(
  response: ThreadReadResponse,
  threadId: string,
): CodexThread {
  if (!response?.thread || !Array.isArray(response.thread.turns)) {
    throw new Error(
      `Codex app-server returned an invalid structured response for thread ${threadId}`,
    );
  }
  return response.thread;
}

// Matches Codex 0.145.0's paginated-history rejection of thread/read with
// includeTurns; -32600 alone is generic, so the message pins it to this cause.
function isPaginatedHistoryError(error: unknown): boolean {
  return (
    error instanceof CodexAppServerRequestError &&
    error.method === "thread/read" &&
    error.code === -32600 &&
    error.message.toLowerCase().includes("paginated")
  );
}

async function readPaginatedThread(
  session: CodexAppServerSession,
  threadId: string,
): Promise<CodexThread> {
  const metadataResponse = await session.request("thread/read", {
    threadId,
    includeTurns: false,
  });
  const baseThread = metadataResponse?.thread;
  if (!baseThread) {
    throw new Error(
      `Codex app-server returned no thread for paginated thread ${threadId}`,
    );
  }

  const turns = await listAllThreadTurns(session, threadId);
  const itemsByTurnId = new Map<string, unknown[]>();
  for (const turn of turns) {
    if (itemsByTurnId.has(turn.id)) {
      throw new Error(
        `Codex app-server returned duplicate turn ${turn.id} for paginated thread ${threadId}`,
      );
    }
    itemsByTurnId.set(turn.id, []);
  }

  for (const entry of await listAllThreadItems(session, threadId)) {
    // Turns and items are fetched as two separate sweeps, so an actively
    // writing thread can surface an item for a turn created after the turn
    // sweep. Drop it to keep a coherent snapshot rather than failing the read.
    const items = itemsByTurnId.get(entry.turnId);
    if (!items) {
      continue;
    }
    items.push(entry.item);
  }

  return {
    ...baseThread,
    turns: turns.map((turn) => ({
      ...turn,
      items: itemsByTurnId.get(turn.id) ?? [],
    })),
  };
}

async function listAllThreadTurns(
  session: CodexAppServerSession,
  threadId: string,
): Promise<CodexThreadTurn[]> {
  return listAllPaginatedEntries(
    (cursor) =>
      session.request("thread/turns/list", {
        threadId,
        cursor,
        limit: threadPageSize,
        sortDirection: "asc",
        itemsView: "notLoaded",
      }),
    isAppServerThreadTurn,
    "thread/turns/list",
    threadId,
  );
}

function isAppServerThreadTurn(value: unknown): value is CodexThreadTurn {
  return isRecord(value) && typeof value.id === "string";
}

async function listAllThreadItems(
  session: CodexAppServerSession,
  threadId: string,
): Promise<ThreadItemEntry[]> {
  return listAllPaginatedEntries(
    (cursor) =>
      session.request("thread/items/list", {
        threadId,
        cursor,
        limit: threadPageSize,
        sortDirection: "asc",
      }),
    isThreadItemEntry,
    "thread/items/list",
    threadId,
  );
}

function isThreadItemEntry(value: unknown): value is ThreadItemEntry {
  return isRecord(value) && typeof value.turnId === "string" && "item" in value;
}

// Both paginated endpoints share cursor semantics; this walks every page in
// order and validates each response from the external process before use.
async function listAllPaginatedEntries<T>(
  requestPage: (cursor: string | null) => Promise<unknown>,
  isEntry: (value: unknown) => value is T,
  method: "thread/turns/list" | "thread/items/list",
  threadId: string,
): Promise<T[]> {
  const entries: T[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | null = null;

  do {
    const response = await requestPage(cursor);
    if (
      !isRecord(response) ||
      !Array.isArray(response.data) ||
      !response.data.every(isEntry) ||
      !(response.nextCursor === null || typeof response.nextCursor === "string")
    ) {
      throw new Error(
        `Codex app-server returned an invalid ${method} response for paginated thread ${threadId}`,
      );
    }

    entries.push(...response.data);
    cursor = response.nextCursor;
    if (cursor && seenCursors.has(cursor)) {
      throw new Error(
        `Codex app-server returned a repeated cursor from ${method} for paginated thread ${threadId}`,
      );
    }
    if (cursor) {
      seenCursors.add(cursor);
    }
  } while (cursor);

  return entries;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function readThreadConversation(
  threadId: string,
): Promise<CodexThreadConversation> {
  const thread = await readThread(threadId);
  return extractThreadConversation(thread.turns);
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

function isThreadNotFoundError(error: unknown, threadId: string): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("thread not found") &&
    message.includes(threadId.toLowerCase())
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

  return error instanceof Error ? error.message : String(error);
}

function extractThreadConversation(
  turns: Array<{ items: unknown[] }>,
): CodexThreadConversation {
  const messages: CodexThreadConversationMessage[] = [];

  for (const turn of turns) {
    for (const item of turn.items) {
      if (isUserMessage(item)) {
        const text = formatMessage(item.content);
        if (text) {
          messages.push({ role: "user", text });
        }
        continue;
      }

      if (isAgentMessage(item)) {
        const text = item.text.trim();
        if (text) {
          messages.push({ role: "agent", text });
        }
      }
    }
  }

  return {
    messages,
    turnCount: turns.length,
  };
}
