import { closeMainWindow, open } from "@raycast/api";
import { execFile, spawn } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { projectRemoteBrowserUrl, remoteToBrowserUrl } from "./project-remote";

const execFileAsync = promisify(execFile);
const codexDocsUrlValue = "https://developers.openai.com/codex/app";
const defaultSqliteMaxBuffer = 1024 * 1024 * 8;
const codexAppPath = "/Applications/Codex.app";
const bundledCodexCliPath = "/Applications/Codex.app/Contents/Resources/codex";
const codexAppServerPageSize = 100;
const codexAppServerTimeoutMs = 10000;

export type CodexProjectRow = {
  cwd: string;
  updated_at?: number | string | null;
  thread_count?: number | string | null;
  git_origin_url?: string | null;
  preview?: string | null;
};

export type CodexProject = {
  id: string;
  path: string;
  name: string;
  updatedAt?: number;
  threadCount: number;
  preview?: string;
  remoteUrl?: string;
  remoteBrowserUrl?: string;
  pathAccessible: boolean;
};

export type CodexAttentionThread = {
  id: string;
  threadId: string;
  title?: string | null;
  cwd?: string | null;
  createdAt?: number | string | null;
  updatedAt?: number | string | null;
  matchReason: "waitingOnUserInput" | "waitingOnApproval" | "recent";
};

type AppServerThreadStatus =
  | { type: "notLoaded" | "idle" | "systemError" }
  | {
      type: "active";
      activeFlags: Array<"waitingOnApproval" | "waitingOnUserInput">;
    };

type AppServerThread = {
  id: string;
  preview: string;
  createdAt: number;
  updatedAt: number;
  status: AppServerThreadStatus;
  cwd: string;
  name: string | null;
};

type AppServerThreadListResponse = {
  data: AppServerThread[];
  nextCursor: string | null;
};

type AppServerResponse<Result> = {
  id?: number;
  result?: Result;
  error?: { message?: string };
};

function codexHomePath() {
  return process.env.CODEX_HOME?.trim() || path.join(os.homedir(), ".codex");
}

function sqliteCandidates() {
  return [
    "/usr/bin/sqlite3",
    "/opt/homebrew/bin/sqlite3",
    "/usr/local/bin/sqlite3",
    "sqlite3",
  ];
}

function sqlitePath() {
  return (
    sqliteCandidates().find(
      (candidate) => candidate === "sqlite3" || existsSync(candidate),
    ) || "sqlite3"
  );
}

async function openStableCodex(url: string) {
  if (!existsSync(codexAppPath)) return false;

  await execFileAsync("open", ["-a", codexAppPath, url]);
  return true;
}

async function openCodexUrl(url: string) {
  await closeMainWindow().catch(() => undefined);

  if (await openStableCodex(url)) return;

  await open(url);
}

function codexCandidates() {
  const pathEntries = (process.env.PATH || "").split(":").filter(Boolean);
  const extras = [
    "/opt/homebrew/bin",
    "/usr/local/bin",
    path.join(os.homedir(), ".local", "bin"),
  ];

  return [
    ...new Set([
      bundledCodexCliPath,
      ...[...pathEntries, ...extras].map((dir) => path.join(dir, "codex")),
    ]),
  ];
}

function latestFilePath(
  directoryPath: string,
  matcher: Parameters<string[]["filter"]>[0],
  description: string,
) {
  const entries = readdirSync(directoryPath)
    .filter(matcher)
    .map((entry) => {
      const filePath = path.join(directoryPath, entry);
      return { filePath, modifiedAt: statSync(filePath).mtimeMs };
    })
    .sort((a, b) => b.modifiedAt - a.modifiedAt);

  const file = entries[0]?.filePath;
  if (file) return file;

  throw new Error(`Could not find ${description} in ${directoryPath}`);
}

function codexStateDatabasePath() {
  const homePath = codexHomePath();
  if (!existsSync(homePath)) {
    throw new Error(`Could not find Codex home at ${homePath}`);
  }

  return latestFilePath(
    homePath,
    (entry) => /^state_\d+\.sqlite$/.test(entry),
    "a Codex state database",
  );
}

function parseJsonRows<Row>(input: string) {
  const value = input.trim();
  if (!value) return [] as Row[];

  const parsed = JSON.parse(value);
  return Array.isArray(parsed) ? (parsed as Row[]) : [];
}

function sqliteCommandError(error: unknown) {
  const execError = error as Error & { code?: string };

  if (execError instanceof Error && execError.code === "ENOENT") {
    return new Error(
      "Could not find `sqlite3`. Install the macOS command line tools and try again.",
    );
  }

  return error;
}

async function querySqliteJson<Row>(
  databasePath: string,
  query: string,
  maxBuffer = defaultSqliteMaxBuffer,
) {
  try {
    const { stdout } = await execFileAsync(
      sqlitePath(),
      ["-json", databasePath, query],
      { maxBuffer },
    );

    return parseJsonRows<Row>(stdout);
  } catch (error) {
    throw sqliteCommandError(error);
  }
}

function cleanPreview(input: string) {
  const value = input.replace(/\s+/g, " ").trim();
  return value || undefined;
}

function canAccessPath(projectPath: string) {
  try {
    return statSync(projectPath).isDirectory();
  } catch {
    return false;
  }
}

function toProject(row: CodexProjectRow): CodexProject {
  const remoteUrl = row.git_origin_url || undefined;

  return {
    id: row.cwd,
    path: row.cwd,
    name: path.basename(row.cwd) || row.cwd,
    updatedAt: row.updated_at ? Number(row.updated_at) || undefined : undefined,
    threadCount: Number(row.thread_count) || 0,
    preview: cleanPreview(row.preview || ""),
    remoteUrl,
    remoteBrowserUrl: remoteUrl ? remoteToBrowserUrl(remoteUrl) : undefined,
    pathAccessible: canAccessPath(row.cwd),
  };
}

function threadTitle(thread: AppServerThread) {
  return thread.name?.trim() || cleanPreview(thread.preview) || thread.id;
}

function threadMatchReason(
  thread: AppServerThread,
): CodexAttentionThread["matchReason"] | null {
  if (thread.status.type !== "active") return null;
  if (thread.status.activeFlags.includes("waitingOnUserInput")) {
    return "waitingOnUserInput";
  }
  if (thread.status.activeFlags.includes("waitingOnApproval")) {
    return "waitingOnApproval";
  }

  return null;
}

function toAttentionThread(
  thread: AppServerThread,
  matchReason: CodexAttentionThread["matchReason"],
): CodexAttentionThread {
  return {
    id: thread.id,
    threadId: thread.id,
    title: threadTitle(thread),
    cwd: thread.cwd || undefined,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    matchReason,
  };
}

function appServerError(method: string, response: AppServerResponse<unknown>) {
  return new Error(
    response.error?.message || `Codex app-server request failed: ${method}`,
  );
}

async function findMostRecentThreadFromAppServer() {
  const cliPath = codexPath();

  return new Promise<CodexAttentionThread | null>((resolve, reject) => {
    const child = spawn(cliPath, ["app-server"], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let settled = false;
    let stderr = "";
    let stdoutBuffer = "";
    let nextId = 1;
    let currentListRequestId: number | null = null;
    let fallbackThread: AppServerThread | null = null;

    const timeout = setTimeout(() => {
      fail(new Error("Timed out while reading live Codex threads."));
    }, codexAppServerTimeoutMs);

    function cleanup() {
      clearTimeout(timeout);
      child.stdout.removeAllListeners();
      child.stderr.removeAllListeners();
      child.removeAllListeners();
      if (!child.killed) {
        child.kill();
      }
    }

    function fail(error: unknown) {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error instanceof Error ? error : new Error(String(error)));
    }

    function succeed(result: CodexAttentionThread | null) {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    }

    function send(method: string, params: unknown) {
      const id = nextId;
      nextId += 1;
      child.stdin.write(
        `${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`,
      );
      return id;
    }

    function requestThreadPage(cursor?: string | null) {
      currentListRequestId = send("thread/list", {
        archived: false,
        cursor: cursor ?? null,
        limit: codexAppServerPageSize,
        sortKey: "updated_at",
      });
    }

    function handleLine(line: string) {
      if (!line.trim()) return;

      let response: AppServerResponse<unknown>;
      try {
        response = JSON.parse(line) as AppServerResponse<unknown>;
      } catch {
        return;
      }

      if (response.id === 1) {
        if (response.error) {
          fail(appServerError("initialize", response));
          return;
        }

        requestThreadPage();
        return;
      }

      if (response.id !== currentListRequestId) return;
      if (response.error) {
        fail(appServerError("thread/list", response));
        return;
      }

      const result = response.result as AppServerThreadListResponse | undefined;
      const threads = result?.data ?? [];

      if (!fallbackThread && threads[0]) {
        fallbackThread = threads[0];
      }

      const attentionThread = threads.find((thread) =>
        threadMatchReason(thread),
      );
      if (attentionThread) {
        succeed(
          toAttentionThread(
            attentionThread,
            threadMatchReason(attentionThread) || "recent",
          ),
        );
        return;
      }

      if (result?.nextCursor) {
        requestThreadPage(result.nextCursor);
        return;
      }

      succeed(
        fallbackThread ? toAttentionThread(fallbackThread, "recent") : null,
      );
    }

    child.on("error", fail);
    child.on("close", (code) => {
      if (settled) return;
      const detail = stderr.trim();
      fail(
        new Error(
          detail ||
            `Codex app-server exited before returning threads (code ${code}).`,
        ),
      );
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdoutBuffer += chunk.toString();
      const lines = stdoutBuffer.split("\n");
      stdoutBuffer = lines.pop() || "";
      lines.forEach(handleLine);
    });

    send("initialize", {
      clientInfo: {
        name: "codex-raycast",
        title: "Codex Raycast",
        version: "0.0.0",
      },
      capabilities: {
        experimentalApi: false,
        optOutNotificationMethods: [],
      },
    });
  });
}

export function codexDocsUrl() {
  return codexDocsUrlValue;
}

export function codexPath() {
  const file = codexCandidates().find((item) => existsSync(item));
  if (file) return file;

  throw new Error(
    "Could not find `codex`. Expected it in the Codex app bundle, on PATH, or in /opt/homebrew/bin, /usr/local/bin, or ~/.local/bin",
  );
}

export async function openProject(dir: string) {
  await openCodexUrl(`codex://new?path=${encodeURIComponent(dir)}`);
}

export async function openThread(threadId: string) {
  await openCodexUrl(`codex://threads/${encodeURIComponent(threadId)}`);
}

export async function openProjectRemote(worktree: string) {
  const url = await projectRemoteBrowserUrl(worktree);
  await closeMainWindow().catch(() => undefined);
  await open(url);
}

export async function queryCodexStateDatabase<Row>(
  query: string,
  maxBuffer?: number,
) {
  return querySqliteJson<Row>(codexStateDatabasePath(), query, maxBuffer);
}

export async function listCodexProjectRows() {
  const query = [
    "with ranked_threads as (",
    "select cwd, updated_at, git_origin_url, first_user_message, title,",
    "row_number() over (partition by cwd order by updated_at desc, created_at desc, id desc) as row_num,",
    "count(*) over (partition by cwd) as thread_count",
    "from threads",
    "where coalesce(cwd, '') != '' and cwd != '/'",
    ")",
    "select cwd, updated_at, thread_count, coalesce(git_origin_url, '') as git_origin_url,",
    "substr(trim(coalesce(nullif(first_user_message, ''), title, '')), 1, 160) as preview",
    "from ranked_threads",
    "where row_num = 1",
    "order by updated_at desc, cwd asc",
  ].join(" ");

  return queryCodexStateDatabase<CodexProjectRow>(query);
}

export async function loadCodexProjects() {
  return (await listCodexProjectRows())
    .filter((row): row is CodexProjectRow => Boolean(row.cwd))
    .map(toProject);
}

export async function findMostRecentAttentionThread() {
  return findMostRecentThreadFromAppServer();
}
