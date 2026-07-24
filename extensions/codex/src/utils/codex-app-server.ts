import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { getCodexCliCommandForShell, resolveCodexCliPath } from "./codex-cli";
import { shellQuote } from "./shell";

const APP_SERVER_ARGS = ["app-server"];
const THREAD_PAGE_SIZE = 50;
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
const SECONDS_PER_DAY = 24 * 60 * 60;
const THREAD_PREVIEW_MAX_CHARACTERS = 600;

export const CODEX_THREAD_LIST_LOOKBACK_DAYS = 30;
export const CODEX_THREAD_LIST_MAX_RESULTS = 500;
const ALL_THREAD_SOURCE_KINDS = [
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

type RequestMethod =
  | "initialize"
  | "thread/list"
  | "thread/read"
  | "thread/turns/list"
  | "thread/name/set"
  | "thread/compact/start"
  | "thread/fork"
  | "thread/archive"
  | "thread/unarchive";

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
  sourceKinds?: Array<(typeof ALL_THREAD_SOURCE_KINDS)[number]> | null;
  archived?: boolean | null;
  cwd?: string | string[] | null;
  useStateDbOnly?: boolean;
  searchTerm?: string | null;
};

type ThreadForkParams = {
  threadId: string;
  excludeTurns?: boolean;
};

type ThreadReadParams = {
  threadId: string;
  includeTurns: boolean;
};

type ThreadTurnsListParams = {
  threadId: string;
  cursor?: string | null;
  limit?: number | null;
  sortDirection?: "asc" | "desc" | null;
};

type ThreadSetNameParams = {
  threadId: string;
  name: string;
};

type ThreadCompactStartParams = {
  threadId: string;
};

type ThreadArchiveParams = {
  threadId: string;
};

type ThreadUnarchiveParams = {
  threadId: string;
};

type RequestParams =
  | InitializeParams
  | ThreadListParams
  | ThreadReadParams
  | ThreadTurnsListParams
  | ThreadSetNameParams
  | ThreadCompactStartParams
  | ThreadForkParams
  | ThreadArchiveParams
  | ThreadUnarchiveParams;

type PendingRequest = {
  method: RequestMethod;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeoutHandle: ReturnType<typeof setTimeout>;
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

type ThreadForkResponse = {
  thread: CodexThread;
};

type ThreadTurn = {
  id: string;
  items: unknown[];
  status: string;
  error: unknown | null;
  startedAt: number | null;
  completedAt: number | null;
  durationMs: number | null;
};

type ThreadTurnsListResponse = {
  data: ThreadTurn[];
  nextCursor: string | null;
  backwardsCursor: string | null;
};

type ThreadSetNameResponse = Record<string, never>;
type ThreadCompactStartResponse = Record<string, never>;

type ThreadUnarchiveResponse = {
  thread: CodexThread;
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
  turns: unknown[];
};

export type CodexThreadLatestMessages = {
  lastUserMessage: string | null;
  lastAgentMessage: string | null;
  lastUserMessageOrder: number | null;
  lastAgentMessageOrder: number | null;
  turnCount: number;
};

export type CodexThreadConversationMessage = {
  role: "user" | "agent";
  text: string;
};

export type CodexThreadConversation = {
  messages: CodexThreadConversationMessage[];
  turnCount: number;
};

export type CodexThreadConversationReadResult =
  | {
      status: "success";
      threadId: string;
      conversation: CodexThreadConversation;
    }
  | {
      status: "failed";
      threadId: string;
      error: string;
    };

type ListThreadsOptions = {
  archived: boolean;
  cwd?: string | null;
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

export class CodexAppServerSession {
  private readonly child: ChildProcessWithoutNullStreams;
  private readonly pendingRequests = new Map<string, PendingRequest>();
  private readonly stderrLines: string[] = [];
  private stdoutBuffer = "";
  private nextRequestId = 1;
  private hasExited = false;

  constructor(codexPath: string) {
    this.child = spawn(codexPath, APP_SERVER_ARGS, {
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
    const response = await this.request<InitializeResponse>("initialize", {
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

  async request<Response>(
    method: RequestMethod,
    params: RequestParams,
    options?: { timeoutMs?: number },
  ): Promise<Response> {
    if (this.hasExited) {
      throw new Error("Codex app-server is not running");
    }

    const requestId = String(this.nextRequestId++);
    const timeoutMs = options?.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    const payload = JSON.stringify({ method, id: requestId, params });

    const responsePromise = new Promise<Response>((resolve, reject) => {
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
          resolve(value as Response);
        },
        reject,
        timeoutHandle,
      });
    });

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
  maxResults = CODEX_THREAD_LIST_MAX_RESULTS,
  windowDays = CODEX_THREAD_LIST_LOOKBACK_DAYS,
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
        THREAD_PAGE_SIZE,
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
          sourceKinds: [...ALL_THREAD_SOURCE_KINDS],
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

function getThreadListCutoffSeconds(windowDays: number): number {
  return (
    Math.floor(Date.now() / 1000) - Math.max(0, windowDays) * SECONDS_PER_DAY
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
  if (normalizedPreview.length <= THREAD_PREVIEW_MAX_CHARACTERS) {
    return normalizedPreview;
  }

  return `${normalizedPreview.slice(0, THREAD_PREVIEW_MAX_CHARACTERS).trimEnd()}...`;
}

export async function forkThread(threadId: string): Promise<CodexThread> {
  return withCodexAppServerSession(async (session) => {
    const response = await session.request<ThreadForkResponse>("thread/fork", {
      threadId,
      excludeTurns: true,
    });

    return response.thread;
  });
}

export async function readLatestThreadMessages(
  threadId: string,
): Promise<CodexThreadLatestMessages> {
  return withCodexAppServerSession(async (session) => {
    const turns = await listThreadTurns(session, threadId, {
      limit: THREAD_PAGE_SIZE,
      sortDirection: "desc",
    });

    return {
      ...extractLatestThreadMessagesFromNewestTurns(turns),
      turnCount: turns.length,
    };
  });
}

export async function readThreadConversation(
  threadId: string,
): Promise<CodexThreadConversation> {
  return withCodexAppServerSession(async (session) => {
    const turns = await listThreadTurns(session, threadId, {
      limit: THREAD_PAGE_SIZE,
      sortDirection: "asc",
    });

    return extractThreadConversation(turns);
  });
}

export async function readThreadConversations(
  threadIds: string[],
): Promise<CodexThreadConversationReadResult[]> {
  return withCodexAppServerSession(async (session) => {
    const results: CodexThreadConversationReadResult[] = [];

    for (const threadId of threadIds) {
      try {
        const turns = await listThreadTurns(session, threadId, {
          limit: THREAD_PAGE_SIZE,
          sortDirection: "asc",
        });
        results.push({
          status: "success",
          threadId,
          conversation: extractThreadConversation(turns),
        });
      } catch (error) {
        results.push({
          status: "failed",
          threadId,
          error: getErrorMessage(error),
        });
      }
    }

    return results;
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
    await session.request<ThreadSetNameResponse>("thread/name/set", {
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
      await session.request<ThreadUnarchiveResponse>("thread/unarchive", {
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
      await session.request<ThreadSetNameResponse>("thread/name/set", {
        threadId,
        name,
      });
    } catch (error) {
      renameError = error;
    }

    try {
      await session.request<Record<string, never>>("thread/archive", {
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

export async function compactThread(threadId: string): Promise<void> {
  await withCodexAppServerSession(async (session) => {
    await session.request<ThreadCompactStartResponse>("thread/compact/start", {
      threadId,
    });
  });
}

export async function archiveThread(threadId: string): Promise<void> {
  await withCodexAppServerSession(async (session) => {
    await session.request<Record<string, never>>("thread/archive", {
      threadId,
    });
  });
}

export async function unarchiveThread(threadId: string): Promise<CodexThread> {
  return withCodexAppServerSession(async (session) => {
    const response = await session.request<ThreadUnarchiveResponse>(
      "thread/unarchive",
      { threadId },
    );
    return response.thread;
  });
}

export function buildCodexResumeCommand(threadId: string): string {
  return `${shellQuote(getCodexCliCommandForShell())} resume ${shellQuote(threadId)}`;
}

async function listThreadTurns(
  session: CodexAppServerSession,
  threadId: string,
  options: {
    limit: number;
    sortDirection: "asc" | "desc";
  },
): Promise<ThreadTurn[]> {
  const turns: ThreadTurn[] = [];
  let cursor: string | null = null;

  do {
    const response: ThreadTurnsListResponse = await session.request(
      "thread/turns/list",
      {
        threadId,
        cursor,
        limit: options.limit,
        sortDirection: options.sortDirection,
      },
    );

    turns.push(...response.data);
    cursor = response.nextCursor;
  } while (cursor);

  return turns;
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

function extractLatestThreadMessagesFromNewestTurns(
  turns: Array<{ items: unknown[] }>,
): Omit<CodexThreadLatestMessages, "turnCount"> {
  let lastUserMessage: string | null = null;
  let lastAgentMessage: string | null = null;
  let lastUserMessageOrder: number | null = null;
  let lastAgentMessageOrder: number | null = null;
  let messageOrder = 0;

  for (const turn of turns) {
    for (
      let itemIndex = turn.items.length - 1;
      itemIndex >= 0;
      itemIndex -= 1
    ) {
      const item = turn.items[itemIndex];

      if (!lastAgentMessage && isAgentMessageItem(item)) {
        lastAgentMessage = item.text.trim() || null;
        lastAgentMessageOrder = messageOrder;
        messageOrder += 1;
      }

      if (!lastUserMessage && isUserMessageItem(item)) {
        lastUserMessage = stringifyUserMessageContent(item.content);
        lastUserMessageOrder = messageOrder;
        messageOrder += 1;
      }

      if (lastUserMessage && lastAgentMessage) {
        return {
          lastUserMessage,
          lastAgentMessage,
          lastUserMessageOrder,
          lastAgentMessageOrder,
        };
      }
    }
  }

  return {
    lastUserMessage,
    lastAgentMessage,
    lastUserMessageOrder,
    lastAgentMessageOrder,
  };
}

function extractThreadConversation(
  turns: Array<{ items: unknown[] }>,
): CodexThreadConversation {
  const messages: CodexThreadConversationMessage[] = [];

  for (const turn of turns) {
    for (const item of turn.items) {
      if (isUserMessageItem(item)) {
        const text = stringifyUserMessageContent(item.content);
        if (text) {
          messages.push({ role: "user", text });
        }
        continue;
      }

      if (isAgentMessageItem(item)) {
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

function isAgentMessageItem(
  item: unknown,
): item is { type: "agentMessage"; text: string } {
  return Boolean(
    item &&
    typeof item === "object" &&
    "type" in item &&
    item.type === "agentMessage" &&
    "text" in item &&
    typeof item.text === "string",
  );
}

function isUserMessageItem(item: unknown): item is {
  type: "userMessage";
  content: unknown[];
} {
  return Boolean(
    item &&
    typeof item === "object" &&
    "type" in item &&
    item.type === "userMessage" &&
    "content" in item &&
    Array.isArray(item.content),
  );
}

function stringifyUserMessageContent(content: unknown[]): string | null {
  const segments: string[] = [];

  for (const input of content) {
    if (!input || typeof input !== "object" || !("type" in input)) {
      continue;
    }

    switch (input.type) {
      case "text":
        if (
          "text" in input &&
          typeof input.text === "string" &&
          input.text.trim()
        ) {
          segments.push(input.text.trim());
        }
        break;
      case "image":
      case "localImage":
        segments.push("[image]");
        break;
      case "skill":
        if ("name" in input && typeof input.name === "string") {
          segments.push(`[skill: ${input.name}]`);
        }
        break;
      case "mention":
        if ("name" in input && typeof input.name === "string") {
          segments.push(`@${input.name}`);
        }
        break;
      default:
        break;
    }
  }

  if (segments.length === 0) {
    return null;
  }

  return segments.join("\n\n");
}
