import { LocalStorage } from "@raycast/api";
import { appendFile, mkdtemp, mkdir, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  findFirstSessionFileByPath,
  findLatestSessionFileByPath,
  loadLatestSessionAnswer,
  loadLatestSessionMessages,
  loadSessionMessages,
  loadTitlesForPaths,
} from "../infrastructure/codex-session-file-store";

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

/**
 * テスト用セッションファイル名
 */
const SESSION_FILE_NAME = "rollout-test.jsonl";

/**
 * turn_context のログ行を作成する
 */
function buildTurnContextLine(cwd: string): string {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    type: "turn_context",
    payload: {
      cwd,
    },
  });
}

/**
 * event_msg のログ行を作成する
 */
function buildEventMessageLine(
  type: "user_message" | "agent_message",
  message: string,
  timestamp: string = new Date().toISOString(),
): string {
  return JSON.stringify({
    timestamp,
    type: "event_msg",
    payload: {
      type,
      message,
      images: [],
      local_images: [],
      text_elements: [],
    },
  });
}

/**
 * event_msg の任意種別ログ行を作成する
 */
function buildEventTypeLine(
  type: string,
  timestamp: string = new Date().toISOString(),
  extraPayload: Record<string, unknown> = {},
): string {
  return JSON.stringify({
    timestamp,
    type: "event_msg",
    payload: {
      type,
      ...extraPayload,
    },
  });
}

/**
 * function_call のログ行を作成する
 */
function buildFunctionCallLine(): string {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    type: "response_item",
    payload: {
      type: "function_call",
      name: "exec_command",
      arguments: "{}",
      call_id: "call_test",
    },
  });
}

/**
 * 任意のツール呼び出し response_item のログ行を作成する
 */
function buildToolCallLine(type: string): string {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    type: "response_item",
    payload: {
      type,
      status: "completed",
      call_id: "call_test",
    },
  });
}

/**
 * response ライフサイクルイベントのログ行を作成する
 */
function buildResponseLifecycleLine(type: "response.completed" | "response.failed" | "response.incomplete"): string {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    type,
  });
}

/**
 * session_meta のログ行を作成する
 */
function buildSessionMetaLine(source: Record<string, unknown> | string, id?: string): string {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    type: "session_meta",
    payload: {
      ...(id ? { id } : {}),
      source,
    },
  });
}

/**
 * セッション用ディレクトリを作成する
 */
async function createSessionDir(codexHome: string, date: Date): Promise<string> {
  const year = date.getFullYear().toString();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const dir = join(codexHome, "sessions", year, month, day);
  await mkdir(dir, { recursive: true });
  return dir;
}

/**
 * セッションファイルを作成する
 */
async function writeSessionFile(sessionDir: string, lines: string[], filename = SESSION_FILE_NAME): Promise<string> {
  const filePath = join(sessionDir, filename);
  await writeFile(filePath, `${lines.join("\n")}\n`, "utf8");
  return filePath;
}

/**
 * テスト用の CODEX_HOME と worktree を作成する
 */
async function setupTestPaths(): Promise<{ codexHome: string; worktreePath: string }> {
  const codexHome = await mkdtemp(join(tmpdir(), "worktree-session-"));
  const worktreePath = await mkdtemp(join(tmpdir(), "worktree-path-"));
  return { codexHome, worktreePath };
}

/**
 * loadTitlesForPaths 用の引数を作成する
 */
function buildLoadArgs(codexHome: string, worktreePath: string) {
  const env = {
    ...process.env,
    CODEX_HOME: codexHome,
    WORKTREE_DECK_SEARCH_DAYS: "1",
  } as NodeJS.ProcessEnv;
  return {
    paths: [worktreePath],
    env,
    cwd: worktreePath,
    homeDir: null,
    assetsPath: "",
    packageDir: process.cwd(),
    packageName: "worktree-deck",
  };
}

/**
 * findLatestSessionFileByPath 用の引数を作成する
 */
function buildFindLatestArgs(codexHome: string, worktreePath: string) {
  const env = {
    ...process.env,
    CODEX_HOME: codexHome,
    WORKTREE_DECK_SEARCH_DAYS: "1",
  } as NodeJS.ProcessEnv;
  return {
    path: worktreePath,
    env,
    cwd: worktreePath,
    homeDir: null,
    assetsPath: "",
    packageDir: process.cwd(),
    packageName: "worktree-deck",
  };
}

/**
 * レビュー用のログ行を作成する
 */
function buildReviewLines(cwd: string, title: string, latestMessage: string): string[] {
  return [
    buildTurnContextLine(cwd),
    buildEventMessageLine("user_message", title),
    buildEventMessageLine("agent_message", latestMessage),
  ];
}

/**
 * response_item のログ行を作成する
 */
function buildResponseMessageLine(
  role: "user" | "assistant" | "developer",
  text: string,
  timestamp: string = new Date().toISOString(),
  contentType?: "input_text" | "output_text",
  phase?: "commentary" | "final_answer",
): string {
  const resolvedContentType = contentType ?? (role === "assistant" ? "output_text" : "input_text");
  return JSON.stringify({
    timestamp,
    type: "response_item",
    payload: {
      type: "message",
      role,
      content: [{ type: resolvedContentType, text }],
      ...(phase ? { phase } : {}),
    },
  });
}

/**
 * goal 継続用 developer message のログ行を作成する
 */
function buildGoalContinuationLine(objective: string, timestamp: string = new Date().toISOString()): string {
  return buildResponseMessageLine(
    "developer",
    `Continue working toward the active thread goal.\n\n<untrusted_objective>\n${objective}\n</untrusted_objective>`,
    timestamp,
    "input_text",
  );
}

describe("loadTitlesForPaths", () => {
  const mockedLocalStorage = vi.mocked(LocalStorage, true);
  let codexHome = "";
  let worktreePath = "";

  beforeEach(async () => {
    mockedLocalStorage.getItem.mockResolvedValue(null);
    mockedLocalStorage.setItem.mockResolvedValue();
    const paths = await setupTestPaths();
    codexHome = paths.codexHome;
    worktreePath = paths.worktreePath;
  });

  afterEach(async () => {
    mockedLocalStorage.getItem.mockReset();
    mockedLocalStorage.setItem.mockReset();
    if (codexHome) {
      await rm(codexHome, { recursive: true, force: true });
    }
    if (worktreePath) {
      await rm(worktreePath, { recursive: true, force: true });
    }
  });

  it("marks status as working while a tool call is running", async () => {
    const sessionDir = await createSessionDir(codexHome, new Date());
    await writeSessionFile(sessionDir, [
      buildTurnContextLine(worktreePath),
      buildEventMessageLine("user_message", "Run the tool"),
      buildEventMessageLine("agent_message", "Starting"),
      buildFunctionCallLine(),
    ]);

    const titlesByPath = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));
    const titles = titlesByPath.get(worktreePath) ?? [];

    expect(titles).toHaveLength(1);
    expect(titles[0]?.status).toBe("working");
  });

  it("session file が未作成でも明示セッションタイトルを表示する", async () => {
    const storageHome = await mkdtemp(join(tmpdir(), "worktree-session-title-home-"));
    const storageDir = join(storageHome, ".worktree-deck", "storage");
    await mkdir(storageDir, { recursive: true });
    await writeFile(
      join(storageDir, "worktree-session-titles.json"),
      JSON.stringify({
        "thread-1": {
          threadId: "thread-1",
          worktreePath,
          title: "セッションタイトル生成",
          source: "auto-start",
          createdAt: "2026-05-20T00:00:00.000Z",
          updatedAt: "2026-05-20T00:00:01.000Z",
        },
      }),
      "utf8",
    );

    try {
      const titlesByPath = await loadTitlesForPaths({
        ...buildLoadArgs(codexHome, worktreePath),
        homeDir: storageHome,
        env: {
          ...process.env,
          CODEX_HOME: codexHome,
          WORKTREE_DECK_DONE_THRESHOLD_DAYS: "30",
          WORKTREE_DECK_SEARCH_DAYS: "1",
        } as NodeJS.ProcessEnv,
      });
      const titles = titlesByPath.get(worktreePath) ?? [];

      expect(titles).toEqual([
        expect.objectContaining({
          title: "セッションタイトル生成",
          status: "working",
          latestMessage: null,
          updatedAt: Date.parse("2026-05-20T00:00:01.000Z"),
          startedAt: Date.parse("2026-05-20T00:00:00.000Z"),
          sessionKind: "main",
        }),
      ]);
    } finally {
      await rm(storageHome, { recursive: true, force: true });
    }
  });

  it("session file に同じ thread id がある場合は明示セッションタイトルを優先する", async () => {
    const storageHome = await mkdtemp(join(tmpdir(), "worktree-session-title-home-"));
    const storageDir = join(storageHome, ".worktree-deck", "storage");
    await mkdir(storageDir, { recursive: true });
    const threadId = "019dd94f-27e0-7ad1-8d17-3d628ac5d16b";
    await writeFile(
      join(storageDir, "worktree-session-titles.json"),
      JSON.stringify({
        [threadId]: {
          threadId,
          worktreePath,
          title: "Explicit title",
          source: "auto-start",
          createdAt: "2026-05-20T00:00:00.000Z",
          updatedAt: "2026-05-20T00:00:01.000Z",
        },
      }),
      "utf8",
    );
    const sessionDir = await createSessionDir(codexHome, new Date());
    await writeSessionFile(sessionDir, [
      buildSessionMetaLine("cli", threadId),
      buildTurnContextLine(worktreePath),
      buildEventMessageLine("user_message", "Old title"),
      buildEventMessageLine("agent_message", "Latest message"),
    ]);

    try {
      const loadArgs = {
        ...buildLoadArgs(codexHome, worktreePath),
        homeDir: storageHome,
        env: {
          ...process.env,
          CODEX_HOME: codexHome,
          WORKTREE_DECK_SEARCH_DAYS: "1",
        } as NodeJS.ProcessEnv,
      };
      const first = await loadTitlesForPaths(loadArgs);
      const second = await loadTitlesForPaths(loadArgs);

      expect(first.get(worktreePath)?.[0]?.title).toBe("Explicit title");
      expect(second.get(worktreePath)?.[0]?.title).toBe("Explicit title");
    } finally {
      await rm(storageHome, { recursive: true, force: true });
    }
  });

  it("古い explicit-only title は done として表示する", async () => {
    const storageHome = await mkdtemp(join(tmpdir(), "worktree-session-title-home-"));
    const storageDir = join(storageHome, ".worktree-deck", "storage");
    await mkdir(storageDir, { recursive: true });
    await writeFile(
      join(storageDir, "worktree-session-titles.json"),
      JSON.stringify({
        "thread-1": {
          threadId: "thread-1",
          worktreePath,
          title: "古いセッションタイトル",
          source: "auto-start",
          createdAt: "2000-01-01T00:00:00.000Z",
          updatedAt: "2000-01-01T00:00:01.000Z",
        },
      }),
      "utf8",
    );

    try {
      const titlesByPath = await loadTitlesForPaths({
        ...buildLoadArgs(codexHome, worktreePath),
        homeDir: storageHome,
        env: {
          ...process.env,
          CODEX_HOME: codexHome,
          WORKTREE_DECK_SEARCH_DAYS: "1",
        } as NodeJS.ProcessEnv,
      });

      expect(titlesByPath.get(worktreePath)?.[0]?.status).toBe("done");
    } finally {
      await rm(storageHome, { recursive: true, force: true });
    }
  });

  it("commentary の assistant メッセージだけでは完了にしない", async () => {
    const sessionDir = await createSessionDir(codexHome, new Date());
    await writeSessionFile(sessionDir, [
      buildTurnContextLine(worktreePath),
      buildEventMessageLine("user_message", "作業を続けて"),
      buildResponseMessageLine("assistant", "途中経過です", "2026-02-11T00:00:00.000Z", "output_text", "commentary"),
    ]);

    const titlesByPath = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));
    const titles = titlesByPath.get(worktreePath) ?? [];

    expect(titles).toHaveLength(1);
    expect(titles[0]?.status).toBe("working");
  });

  it("goal 継続セッションを objective title で作業中として表示する", async () => {
    const sessionDir = await createSessionDir(codexHome, new Date());
    await writeSessionFile(sessionDir, [
      buildTurnContextLine(worktreePath),
      buildGoalContinuationLine("docs/base_plan.md に従ってアプリケーションを完成させて。"),
      buildResponseMessageLine("assistant", "途中経過です", "2026-02-11T00:00:00.000Z", "output_text", "commentary"),
    ]);

    const titlesByPath = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));
    const titles = titlesByPath.get(worktreePath) ?? [];

    expect(titles).toHaveLength(1);
    expect(titles[0]?.title).toBe("docs/base_plan.md に従ってアプリケーションを完成させて。");
    expect(titles[0]?.status).toBe("working");
  });

  it("phase がない assistant メッセージは完了にしない", async () => {
    const sessionDir = await createSessionDir(codexHome, new Date());
    await writeSessionFile(sessionDir, [
      buildTurnContextLine(worktreePath),
      buildEventMessageLine("user_message", "作業を続けて"),
      buildResponseMessageLine("assistant", "途中経過です", "2026-02-11T00:00:00.000Z", "output_text"),
    ]);

    const titlesByPath = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));
    const titles = titlesByPath.get(worktreePath) ?? [];

    expect(titles).toHaveLength(1);
    expect(titles[0]?.status).toBe("working");
  });

  it("custom_tool_call を検出したら作業中に戻す", async () => {
    const sessionDir = await createSessionDir(codexHome, new Date());
    await writeSessionFile(sessionDir, [
      buildTurnContextLine(worktreePath),
      buildEventMessageLine("user_message", "作業を続けて"),
      buildEventMessageLine("agent_message", "了解です"),
      buildToolCallLine("custom_tool_call"),
    ]);

    const titlesByPath = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));
    const titles = titlesByPath.get(worktreePath) ?? [];

    expect(titles).toHaveLength(1);
    expect(titles[0]?.status).toBe("working");
  });

  it("web_search_call を検出したら作業中に戻す", async () => {
    const sessionDir = await createSessionDir(codexHome, new Date());
    await writeSessionFile(sessionDir, [
      buildTurnContextLine(worktreePath),
      buildEventMessageLine("user_message", "作業を続けて"),
      buildEventMessageLine("agent_message", "了解です"),
      buildToolCallLine("web_search_call"),
    ]);

    const titlesByPath = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));
    const titles = titlesByPath.get(worktreePath) ?? [];

    expect(titles).toHaveLength(1);
    expect(titles[0]?.status).toBe("working");
  });

  it("final_answer の assistant メッセージで完了にする", async () => {
    const sessionDir = await createSessionDir(codexHome, new Date());
    await writeSessionFile(sessionDir, [
      buildTurnContextLine(worktreePath),
      buildEventMessageLine("user_message", "作業を続けて"),
      buildResponseMessageLine("assistant", "途中経過です", "2026-02-11T00:00:00.000Z", "output_text", "commentary"),
      buildResponseMessageLine("assistant", "完了しました", "2026-02-11T00:00:01.000Z", "output_text", "final_answer"),
    ]);

    const titlesByPath = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));
    const titles = titlesByPath.get(worktreePath) ?? [];

    expect(titles).toHaveLength(1);
    expect(titles[0]?.status).toBe("done");
  });

  it("response.completed を検出したら完了にする", async () => {
    const sessionDir = await createSessionDir(codexHome, new Date());
    await writeSessionFile(sessionDir, [
      buildTurnContextLine(worktreePath),
      buildEventMessageLine("user_message", "作業を続けて"),
      buildToolCallLine("web_search_call"),
      buildResponseLifecycleLine("response.completed"),
    ]);

    const titlesByPath = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));
    const titles = titlesByPath.get(worktreePath) ?? [];

    expect(titles).toHaveLength(1);
    expect(titles[0]?.status).toBe("done");
  });

  it("response.incomplete を検出しても完了に畳み込む", async () => {
    const sessionDir = await createSessionDir(codexHome, new Date());
    await writeSessionFile(sessionDir, [
      buildTurnContextLine(worktreePath),
      buildEventMessageLine("user_message", "作業を続けて"),
      buildToolCallLine("web_search_call"),
      buildResponseLifecycleLine("response.incomplete"),
    ]);

    const titlesByPath = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));
    const titles = titlesByPath.get(worktreePath) ?? [];

    expect(titles).toHaveLength(1);
    expect(titles[0]?.status).toBe("done");
  });

  it("turn_aborted を検出しても完了に畳み込む", async () => {
    const sessionDir = await createSessionDir(codexHome, new Date());
    await writeSessionFile(sessionDir, [
      buildTurnContextLine(worktreePath),
      buildEventMessageLine("user_message", "作業を続けて"),
      buildToolCallLine("web_search_call"),
      buildEventTypeLine("turn_aborted"),
    ]);

    const titlesByPath = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));
    const titles = titlesByPath.get(worktreePath) ?? [];

    expect(titles).toHaveLength(1);
    expect(titles[0]?.status).toBe("done");
  });

  it("末尾の巨大な final_answer 行でも完了を判定する", async () => {
    const sessionDir = await createSessionDir(codexHome, new Date());
    const hugeCommentary = "c".repeat(300_000);
    const hugeFinalAnswer = "f".repeat(300_000);
    await writeSessionFile(sessionDir, [
      buildTurnContextLine(worktreePath),
      buildEventMessageLine("user_message", "巨大ログの完了判定を確認して"),
      buildFunctionCallLine(),
      buildResponseMessageLine("assistant", hugeCommentary, "2026-02-11T00:00:00.000Z", "output_text", "commentary"),
      buildResponseMessageLine("assistant", hugeFinalAnswer, "2026-02-11T00:00:01.000Z", "output_text", "final_answer"),
    ]);

    const titlesByPath = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));
    const titles = titlesByPath.get(worktreePath) ?? [];

    expect(titles).toHaveLength(1);
    expect(titles[0]?.status).toBe("done");
  });

  it("exited_review_mode の直後に phase なし assistant メッセージが来ても完了を維持する", async () => {
    const sessionDir = await createSessionDir(codexHome, new Date());
    const exitAt = "2026-02-11T21:35:41.592Z";
    const assistantAt = "2026-02-11T21:35:41.592Z";
    await writeSessionFile(sessionDir, [
      buildTurnContextLine(worktreePath),
      buildEventMessageLine("user_message", "レビューして"),
      buildToolCallLine("custom_tool_call"),
      buildEventTypeLine("exited_review_mode", exitAt),
      buildResponseMessageLine("assistant", "Review comment", assistantAt, "output_text"),
    ]);

    const titlesByPath = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));
    const titles = titlesByPath.get(worktreePath) ?? [];

    expect(titles).toHaveLength(1);
    expect(titles[0]?.status).toBe("done");
  });

  it("entered_review_mode を検出したら作業中に戻す", async () => {
    const sessionDir = await createSessionDir(codexHome, new Date());
    const enteredAt = "2026-02-11T22:57:49.007Z";
    await writeSessionFile(sessionDir, [
      buildTurnContextLine(worktreePath),
      buildEventMessageLine("user_message", "レビューして"),
      buildResponseLifecycleLine("response.completed"),
      buildEventTypeLine("entered_review_mode", enteredAt),
    ]);

    const titlesByPath = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));
    const titles = titlesByPath.get(worktreePath) ?? [];

    expect(titles).toHaveLength(1);
    expect(titles[0]?.status).toBe("working");
  });

  it("review モード中の response.completed では完了にしない", async () => {
    const sessionDir = await createSessionDir(codexHome, new Date());
    const enteredAt = "2026-02-11T22:57:49.007Z";
    await writeSessionFile(sessionDir, [
      buildTurnContextLine(worktreePath),
      buildEventMessageLine("user_message", "レビューして"),
      buildEventTypeLine("entered_review_mode", enteredAt),
      buildResponseLifecycleLine("response.completed"),
    ]);

    const titlesByPath = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));
    const titles = titlesByPath.get(worktreePath) ?? [];

    expect(titles).toHaveLength(1);
    expect(titles[0]?.status).toBe("working");
  });

  it("review モード中の response.incomplete は完了に畳み込む", async () => {
    const sessionDir = await createSessionDir(codexHome, new Date());
    const enteredAt = "2026-02-11T22:57:49.007Z";
    await writeSessionFile(sessionDir, [
      buildTurnContextLine(worktreePath),
      buildEventMessageLine("user_message", "レビューして"),
      buildEventTypeLine("entered_review_mode", enteredAt),
      buildResponseLifecycleLine("response.incomplete"),
    ]);

    const titlesByPath = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));
    const titles = titlesByPath.get(worktreePath) ?? [];

    expect(titles).toHaveLength(1);
    expect(titles[0]?.status).toBe("done");
  });

  it("review モード中の response.failed は完了に畳み込む", async () => {
    const sessionDir = await createSessionDir(codexHome, new Date());
    const enteredAt = "2026-02-11T22:57:49.007Z";
    await writeSessionFile(sessionDir, [
      buildTurnContextLine(worktreePath),
      buildEventMessageLine("user_message", "レビューして"),
      buildEventTypeLine("entered_review_mode", enteredAt),
      buildResponseLifecycleLine("response.failed"),
    ]);

    const titlesByPath = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));
    const titles = titlesByPath.get(worktreePath) ?? [];

    expect(titles).toHaveLength(1);
    expect(titles[0]?.status).toBe("done");
  });

  it("task_complete を検出したら完了にする", async () => {
    const sessionDir = await createSessionDir(codexHome, new Date());
    await writeSessionFile(sessionDir, [
      buildTurnContextLine(worktreePath),
      buildEventMessageLine("user_message", "レビューして"),
      buildEventTypeLine("entered_review_mode"),
      buildEventTypeLine("task_complete"),
    ]);

    const titlesByPath = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));
    const titles = titlesByPath.get(worktreePath) ?? [];

    expect(titles).toHaveLength(1);
    expect(titles[0]?.status).toBe("done");
  });

  it("review モード外の task_complete では review セッション扱いにしない", async () => {
    const sessionDir = await createSessionDir(codexHome, new Date());
    await writeSessionFile(sessionDir, [
      buildTurnContextLine(worktreePath),
      buildEventMessageLine("user_message", "通常作業を完了して"),
      buildResponseLifecycleLine("response.completed"),
      buildEventTypeLine("task_complete"),
    ]);

    const titlesByPath = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));
    const titles = titlesByPath.get(worktreePath) ?? [];

    expect(titles).toHaveLength(1);
    expect(titles[0]?.status).toBe("done");
    expect(titles[0]?.sessionKind).toBe("main");
  });

  it("review 完了後に再度 entered_review_mode が来たら作業中に戻す", async () => {
    const sessionDir = await createSessionDir(codexHome, new Date());
    const exitedAt = "2026-02-11T13:08:59.238Z";
    const enteredAt = "2026-02-11T22:57:49.007Z";
    await writeSessionFile(sessionDir, [
      buildTurnContextLine(worktreePath),
      buildEventMessageLine("user_message", "レビューして"),
      buildToolCallLine("custom_tool_call"),
      buildEventTypeLine("exited_review_mode", exitedAt),
      buildResponseMessageLine("assistant", "Review comment", exitedAt, "output_text"),
      buildEventTypeLine("entered_review_mode", enteredAt),
    ]);

    const titlesByPath = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));
    const titles = titlesByPath.get(worktreePath) ?? [];

    expect(titles).toHaveLength(1);
    expect(titles[0]?.status).toBe("working");
  });

  it("同じタイトルでもセッションファイルごとに保持する", async () => {
    const now = new Date();
    const sessionDir = await createSessionDir(codexHome, now);
    const title = "Review the current code changes (staged, unstaged, and untracked files)";
    const expectedTitle = title.slice(0, 60);

    const firstFile = await writeSessionFile(
      sessionDir,
      buildReviewLines(worktreePath, title, "Latest review message. A"),
      "first.jsonl",
    );
    const secondFile = await writeSessionFile(
      sessionDir,
      buildReviewLines(worktreePath, title, "Latest review message. B"),
      "second.jsonl",
    );

    const firstTime = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const secondTime = new Date(now.getTime() - 1 * 60 * 60 * 1000);
    await utimes(firstFile, firstTime, firstTime);
    await utimes(secondFile, secondTime, secondTime);

    const result = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));
    const titles = result.get(worktreePath);

    expect(titles).toBeDefined();
    expect(titles).toHaveLength(2);
    expect(titles?.[0]?.title).toBe(expectedTitle);
    expect(titles?.[1]?.title).toBe(expectedTitle);
    expect(titles?.[0]?.updatedAt).toBeGreaterThan(titles?.[1]?.updatedAt ?? 0);
  });

  it("review サブエージェントがある場合は親レビューセッションの重複を除外する", async () => {
    const now = new Date();
    const sessionDir = await createSessionDir(codexHome, now);
    const title = "Review the code changes again and list issues";
    const expectedTitle = title.slice(0, 60);

    const parentFirst = await writeSessionFile(
      sessionDir,
      [
        buildTurnContextLine(worktreePath),
        buildEventTypeLine("task_started", undefined, { turn_id: "shared-turn-first" }),
        buildEventMessageLine("user_message", title),
        buildEventTypeLine("entered_review_mode"),
        buildEventTypeLine("exited_review_mode"),
        buildEventMessageLine("agent_message", "Matched first result"),
      ],
      "parent-first.jsonl",
    );
    const subagentFirst = await writeSessionFile(
      sessionDir,
      [
        buildSessionMetaLine({ subagent: "review" }),
        buildEventTypeLine("task_started", undefined, { turn_id: "shared-turn-first" }),
        ...buildReviewLines(worktreePath, title, "Matched first result"),
      ],
      "subagent-first.jsonl",
    );

    const parentSecond = await writeSessionFile(
      sessionDir,
      [
        buildTurnContextLine(worktreePath),
        buildEventTypeLine("task_started", undefined, { turn_id: "shared-turn-second" }),
        buildEventMessageLine("user_message", title),
        buildEventTypeLine("entered_review_mode"),
        buildEventTypeLine("exited_review_mode"),
        buildEventMessageLine("agent_message", "Matched second result"),
      ],
      "parent-second.jsonl",
    );
    const subagentSecond = await writeSessionFile(
      sessionDir,
      [
        buildSessionMetaLine({ subagent: "review" }),
        buildEventTypeLine("task_started", undefined, { turn_id: "shared-turn-second" }),
        ...buildReviewLines(worktreePath, title, "Matched second result"),
      ],
      "subagent-second.jsonl",
    );

    const parentFirstTime = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const subagentFirstTime = new Date(now.getTime() - 2 * 60 * 60 * 1000 + 30 * 1000);
    const parentSecondTime = new Date(now.getTime() - 60 * 60 * 1000);
    const subagentSecondTime = new Date(now.getTime() - 60 * 60 * 1000 + 30 * 1000);
    await utimes(parentFirst, parentFirstTime, parentFirstTime);
    await utimes(subagentFirst, subagentFirstTime, subagentFirstTime);
    await utimes(parentSecond, parentSecondTime, parentSecondTime);
    await utimes(subagentSecond, subagentSecondTime, subagentSecondTime);

    const result = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));
    const titles = result.get(worktreePath);

    expect(titles).toBeDefined();
    expect(titles).toHaveLength(2);
    expect(titles?.[0]?.title).toBe(expectedTitle);
    expect(titles?.[1]?.title).toBe(expectedTitle);
    expect(titles?.[0]?.sessionPath).toBe(subagentSecond);
    expect(titles?.[1]?.sessionPath).toBe(subagentFirst);
  });

  it("レビューイベントがない通常セッションは review タイトルでも除外しない", async () => {
    const now = new Date();
    const sessionDir = await createSessionDir(codexHome, now);
    const title = "Review the code changes again and list issues";

    const normalSession = await writeSessionFile(
      sessionDir,
      [
        buildTurnContextLine(worktreePath),
        buildEventMessageLine("user_message", title),
        buildEventMessageLine("agent_message", "Normal discussion"),
      ],
      "normal-review-prefix.jsonl",
    );
    const reviewSubagent = await writeSessionFile(
      sessionDir,
      [buildSessionMetaLine({ subagent: "review" }), ...buildReviewLines(worktreePath, title, "Review output")],
      "subagent-for-normal.jsonl",
    );

    const normalTime = new Date(now.getTime() - 2 * 60 * 1000);
    const subagentTime = new Date(now.getTime() - 60 * 1000);
    await utimes(normalSession, normalTime, normalTime);
    await utimes(reviewSubagent, subagentTime, subagentTime);

    const result = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));
    const titles = result.get(worktreePath) ?? [];

    expect(titles).toHaveLength(2);
    expect(titles.some((entry) => entry.sessionPath === normalSession)).toBe(true);
    expect(titles.some((entry) => entry.sessionPath === reviewSubagent)).toBe(true);
  });

  it("review 小文字タイトルでも review 親セッション重複を除外する", async () => {
    const now = new Date();
    const sessionDir = await createSessionDir(codexHome, now);
    const title = "review the code changes again and list issues";

    const parentSession = await writeSessionFile(
      sessionDir,
      [
        buildTurnContextLine(worktreePath),
        buildEventTypeLine("task_started", undefined, { turn_id: "shared-lowercase-turn" }),
        buildEventMessageLine("user_message", title),
        buildEventTypeLine("entered_review_mode"),
        buildEventTypeLine("exited_review_mode"),
        buildEventMessageLine("agent_message", "Matched lowercase result"),
      ],
      "parent-lowercase-title.jsonl",
    );
    const reviewSubagent = await writeSessionFile(
      sessionDir,
      [
        buildSessionMetaLine({ subagent: "review" }),
        buildEventTypeLine("task_started", undefined, { turn_id: "shared-lowercase-turn" }),
        ...buildReviewLines(worktreePath, title, "Matched lowercase result"),
      ],
      "subagent-lowercase-title.jsonl",
    );

    const parentTime = new Date(now.getTime() - 2 * 60 * 1000);
    const subagentTime = new Date(now.getTime() - 60 * 1000);
    await utimes(parentSession, parentTime, parentTime);
    await utimes(reviewSubagent, subagentTime, subagentTime);

    const result = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));
    const titles = result.get(worktreePath) ?? [];

    expect(titles).toHaveLength(1);
    expect(titles[0]?.sessionPath).toBe(reviewSubagent);
  });

  it("タイトル先頭60文字が同じ別レビューは重複除外しない", async () => {
    const now = new Date();
    const sessionDir = await createSessionDir(codexHome, now);
    const sharedPrefix = "Review ".concat("x".repeat(70));
    const parentOnlyTitle = `${sharedPrefix} parent-only`;
    const subagentOnlyTitle = `${sharedPrefix} subagent-only`;

    const parentSession = await writeSessionFile(
      sessionDir,
      [
        buildTurnContextLine(worktreePath),
        buildEventMessageLine("user_message", parentOnlyTitle),
        buildEventTypeLine("entered_review_mode"),
        buildEventTypeLine("exited_review_mode"),
        buildEventMessageLine("agent_message", "Parent unique review"),
      ],
      "parent-shared-prefix.jsonl",
    );
    const reviewSubagent = await writeSessionFile(
      sessionDir,
      [
        buildSessionMetaLine({ subagent: "review" }),
        ...buildReviewLines(worktreePath, subagentOnlyTitle, "Subagent different review"),
      ],
      "subagent-shared-prefix.jsonl",
    );

    const parentTime = new Date(now.getTime() - 2 * 60 * 1000);
    const subagentTime = new Date(now.getTime() - 60 * 1000);
    await utimes(parentSession, parentTime, parentTime);
    await utimes(reviewSubagent, subagentTime, subagentTime);

    const result = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));
    const titles = result.get(worktreePath) ?? [];

    expect(titles).toHaveLength(2);
    expect(titles.some((entry) => entry.sessionPath === parentSession)).toBe(true);
    expect(titles.some((entry) => entry.sessionPath === reviewSubagent)).toBe(true);
  });

  it("turn_id が異なる同一メッセージは review 親重複として除外しない", async () => {
    const now = new Date();
    const sessionDir = await createSessionDir(codexHome, now);
    const title = "Review the code changes again and list issues";
    const sharedMessage = "No issues found";

    const parentSession = await writeSessionFile(
      sessionDir,
      [
        buildTurnContextLine(worktreePath),
        buildEventMessageLine("user_message", title),
        buildEventTypeLine("task_started", undefined, { turn_id: "parent-turn-only" }),
        buildEventTypeLine("entered_review_mode"),
        buildEventTypeLine("exited_review_mode"),
        buildEventMessageLine("agent_message", sharedMessage),
      ],
      "parent-turn-id-mismatch.jsonl",
    );
    const reviewSubagent = await writeSessionFile(
      sessionDir,
      [
        buildSessionMetaLine({ subagent: "review" }),
        buildEventTypeLine("task_started", undefined, { turn_id: "subagent-turn-only" }),
        ...buildReviewLines(worktreePath, title, sharedMessage),
      ],
      "subagent-turn-id-mismatch.jsonl",
    );

    const parentTime = new Date(now.getTime() - 2 * 60 * 1000);
    const subagentTime = new Date(now.getTime() - 60 * 1000);
    await utimes(parentSession, parentTime, parentTime);
    await utimes(reviewSubagent, subagentTime, subagentTime);

    const result = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));
    const titles = result.get(worktreePath) ?? [];

    expect(titles).toHaveLength(2);
    expect(titles.some((entry) => entry.sessionPath === parentSession)).toBe(true);
    expect(titles.some((entry) => entry.sessionPath === reviewSubagent)).toBe(true);
  });

  it("通常ターンがタイトルのセッションは後続 review turn があっても除外しない", async () => {
    const now = new Date();
    const sessionDir = await createSessionDir(codexHome, now);
    const normalTitle = "Implement feature and discuss approach";
    const reviewTitle = "Review the code changes again and list issues";

    const parentSession = await writeSessionFile(
      sessionDir,
      [
        buildTurnContextLine(worktreePath),
        buildEventTypeLine("task_started", undefined, { turn_id: "normal-turn" }),
        buildEventMessageLine("user_message", normalTitle),
        buildEventTypeLine("task_started", undefined, { turn_id: "review-turn" }),
        buildEventTypeLine("entered_review_mode"),
        buildEventMessageLine("user_message", reviewTitle),
        buildEventTypeLine("exited_review_mode"),
        buildEventMessageLine("agent_message", "Review output"),
      ],
      "parent-mixed-turns.jsonl",
    );
    const reviewSubagent = await writeSessionFile(
      sessionDir,
      [
        buildSessionMetaLine({ subagent: "review" }),
        buildEventTypeLine("task_started", undefined, { turn_id: "review-turn" }),
        ...buildReviewLines(worktreePath, reviewTitle, "Review output"),
      ],
      "subagent-mixed-turns.jsonl",
    );

    const parentTime = new Date(now.getTime() - 2 * 60 * 1000);
    const subagentTime = new Date(now.getTime() - 60 * 1000);
    await utimes(parentSession, parentTime, parentTime);
    await utimes(reviewSubagent, subagentTime, subagentTime);

    const result = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));
    const titles = result.get(worktreePath) ?? [];

    expect(titles).toHaveLength(2);
    expect(titles.some((entry) => entry.sessionPath === parentSession)).toBe(true);
    expect(titles.some((entry) => entry.sessionPath === reviewSubagent)).toBe(true);
  });

  it("セッションパスを保持する", async () => {
    const sessionDir = await createSessionDir(codexHome, new Date());
    const sessionFile = await writeSessionFile(
      sessionDir,
      buildReviewLines(worktreePath, "Review a file", "Latest review message."),
      "session-path.jsonl",
    );

    const titlesByPath = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));
    const titles = titlesByPath.get(worktreePath) ?? [];

    expect(titles).toHaveLength(1);
    expect(titles[0]?.sessionPath).toBe(sessionFile);
  });

  it("review サブエージェントのセッションを一覧に含める", async () => {
    const sessionDir = await createSessionDir(codexHome, new Date());
    const title = "Review the current code changes (staged, unstaged, and untracked files)";

    const reviewSubagentFile = await writeSessionFile(
      sessionDir,
      [
        buildSessionMetaLine({ subagent: "review" }),
        ...buildReviewLines(worktreePath, title, "Latest review message."),
      ],
      "review-subagent.jsonl",
    );

    const titlesByPath = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));
    const titles = titlesByPath.get(worktreePath) ?? [];

    expect(titles).toHaveLength(1);
    expect(titles[0]?.sessionPath).toBe(reviewSubagentFile);
  });

  it("review サブエージェントはレビューイベント前でも review セッション扱いにする", async () => {
    const sessionDir = await createSessionDir(codexHome, new Date());
    const title = "Review current git working tree changes";

    await writeSessionFile(
      sessionDir,
      [
        buildSessionMetaLine({ subagent: "review" }),
        buildTurnContextLine(worktreePath),
        buildEventMessageLine("user_message", title),
      ],
      "review-subagent-before-events.jsonl",
    );

    const titlesByPath = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));
    const titles = titlesByPath.get(worktreePath) ?? [];

    expect(titles).toHaveLength(1);
    expect(titles[0]?.sessionKind).toBe("reviewSubagent");
    expect(titles[0]?.status).toBe("working");
  });

  it("review 以外のサブエージェントのセッションを一覧から除外する", async () => {
    const sessionDir = await createSessionDir(codexHome, new Date());
    const title = "Review the current code changes (staged, unstaged, and untracked files)";

    const normalFile = await writeSessionFile(
      sessionDir,
      [buildSessionMetaLine("cli"), ...buildReviewLines(worktreePath, title, "Latest review message.")],
      "normal.jsonl",
    );
    await writeSessionFile(
      sessionDir,
      [
        buildSessionMetaLine({ subagent: "worker" }),
        ...buildReviewLines(worktreePath, title, "Latest review message."),
      ],
      "worker-subagent.jsonl",
    );

    const titlesByPath = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));
    const titles = titlesByPath.get(worktreePath) ?? [];

    expect(titles).toHaveLength(1);
    expect(titles[0]?.sessionPath).toBe(normalFile);
  });

  it("source が subagent 文字列のセッションを一覧から除外する", async () => {
    const sessionDir = await createSessionDir(codexHome, new Date());
    const title = "Review the current code changes (staged, unstaged, and untracked files)";

    const normalFile = await writeSessionFile(
      sessionDir,
      [buildSessionMetaLine("cli"), ...buildReviewLines(worktreePath, title, "Latest review message.")],
      "normal-source-string.jsonl",
    );
    await writeSessionFile(
      sessionDir,
      [buildSessionMetaLine("subagent"), ...buildReviewLines(worktreePath, title, "Latest review message.")],
      "subagent-source-string.jsonl",
    );

    const titlesByPath = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));
    const titles = titlesByPath.get(worktreePath) ?? [];

    expect(titles).toHaveLength(1);
    expect(titles[0]?.sessionPath).toBe(normalFile);
  });

  it("source.type が subagent のセッションを一覧から除外する", async () => {
    const sessionDir = await createSessionDir(codexHome, new Date());
    const title = "Review the current code changes (staged, unstaged, and untracked files)";

    const normalFile = await writeSessionFile(
      sessionDir,
      [buildSessionMetaLine("cli"), ...buildReviewLines(worktreePath, title, "Latest review message.")],
      "normal-source-type.jsonl",
    );
    await writeSessionFile(
      sessionDir,
      [buildSessionMetaLine({ type: "subagent" }), ...buildReviewLines(worktreePath, title, "Latest review message.")],
      "subagent-source-type.jsonl",
    );

    const titlesByPath = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));
    const titles = titlesByPath.get(worktreePath) ?? [];

    expect(titles).toHaveLength(1);
    expect(titles[0]?.sessionPath).toBe(normalFile);
  });

  it("source.subagent.thread_spawn のセッションを一覧から除外する", async () => {
    const sessionDir = await createSessionDir(codexHome, new Date());
    const title = "Review the current code changes (staged, unstaged, and untracked files)";

    const normalFile = await writeSessionFile(
      sessionDir,
      [buildSessionMetaLine("cli"), ...buildReviewLines(worktreePath, title, "Latest review message.")],
      "normal-thread-spawn-source.jsonl",
    );
    await writeSessionFile(
      sessionDir,
      [
        buildSessionMetaLine({
          subagent: {
            thread_spawn: {
              parent_thread_id: "thread_parent_001",
            },
          },
        }),
        ...buildReviewLines(worktreePath, title, "Latest review message."),
      ],
      "thread-spawn-source.jsonl",
    );

    const titlesByPath = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));
    const titles = titlesByPath.get(worktreePath) ?? [];

    expect(titles).toHaveLength(1);
    expect(titles[0]?.sessionPath).toBe(normalFile);
  });

  it("source.subagent が object なら thread_spawn 以外でも一覧から除外する", async () => {
    const sessionDir = await createSessionDir(codexHome, new Date());
    const title = "Review the current code changes (staged, unstaged, and untracked files)";

    const normalFile = await writeSessionFile(
      sessionDir,
      [buildSessionMetaLine("cli"), ...buildReviewLines(worktreePath, title, "Latest review message.")],
      "normal-invalid-thread-spawn-source.jsonl",
    );
    await writeSessionFile(
      sessionDir,
      [
        buildSessionMetaLine({
          subagent: {
            thread_spawn: {},
          },
        }),
        ...buildReviewLines(worktreePath, title, "Latest review message."),
      ],
      "invalid-thread-spawn-source.jsonl",
    );

    const titlesByPath = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));
    const titles = titlesByPath.get(worktreePath) ?? [];

    expect(titles).toHaveLength(1);
    expect(titles[0]?.sessionPath).toBe(normalFile);
  });

  it("guardian の自動レビューセッションを一覧から除外する", async () => {
    const sessionDir = await createSessionDir(codexHome, new Date());
    const title = "The following is the Codex agent history whose request action you are assessing";

    const normalFile = await writeSessionFile(
      sessionDir,
      [buildSessionMetaLine("cli"), ...buildReviewLines(worktreePath, "通常の作業", "Latest message.")],
      "normal-for-guardian.jsonl",
    );
    const guardianFile = await writeSessionFile(
      sessionDir,
      [
        buildSessionMetaLine({ type: "subagent", subagent: { other: "guardian" } }),
        buildTurnContextLine(worktreePath),
        buildEventMessageLine("user_message", title),
        buildEventMessageLine("agent_message", '{"outcome":"allow"}'),
      ],
      "guardian-auto-review.jsonl",
    );

    const titlesByPath = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));
    const titles = titlesByPath.get(worktreePath) ?? [];

    expect(titles).toHaveLength(1);
    expect(titles[0]?.sessionPath).toBe(normalFile);
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    const savedCache = JSON.parse(String(mockedLocalStorage.setItem.mock.calls.at(-1)?.[1])) as {
      files: Record<string, { sessionKind?: string }>;
    };
    expect(savedCache.files[guardianFile]?.sessionKind).toBe("autoReview");
  });

  it("大きい動作中セッションの中間にあるスキル履歴を追記更新し既存履歴を保持する", async () => {
    const sessionDir = await createSessionDir(codexHome, new Date());
    const storage = new Map<string, string>();
    mockedLocalStorage.getItem.mockImplementation(async (key: string) => storage.get(key) ?? null);
    mockedLocalStorage.setItem.mockImplementation(async (key: string, value: unknown) => {
      storage.set(key, typeof value === "string" ? value : JSON.stringify(value));
    });
    const sessionPath = await writeSessionFile(sessionDir, [
      buildTurnContextLine(worktreePath),
      buildEventMessageLine("user_message", "Active large session"),
      "x".repeat(300 * 1024),
      buildResponseMessageLine(
        "user",
        [
          "<skill>",
          "<name>review-by-sub-agents</name>",
          "<path>/Users/me/.codex/skills/review-by-sub-agents/SKILL.md</path>",
          "</skill>",
        ].join("\n"),
        "2026-05-03T10:00:00.000Z",
      ),
      "x".repeat(300 * 1024),
      buildFunctionCallLine(),
    ]);

    const first = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    await appendFile(
      sessionPath,
      `${buildEventMessageLine("agent_message", "github:gh-fix-ci を使います。", "2026-05-03T10:10:00.000Z")}\n`,
      "utf8",
    );

    const second = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));

    expect(first.get(worktreePath)?.[0]?.skillUsages).toEqual([
      { name: "review-by-sub-agents", timestamp: "2026-05-03T10:00:00.000Z" },
    ]);
    expect(second.get(worktreePath)?.[0]?.skillUsages).toEqual([
      { name: "review-by-sub-agents", timestamp: "2026-05-03T10:00:00.000Z" },
      { name: "github:gh-fix-ci", timestamp: "2026-05-03T10:10:00.000Z" },
    ]);
  });

  it("スキル履歴の追記スキャンは未完了行を次回に持ち越す", async () => {
    const sessionDir = await createSessionDir(codexHome, new Date());
    const storage = new Map<string, string>();
    mockedLocalStorage.getItem.mockImplementation(async (key: string) => storage.get(key) ?? null);
    mockedLocalStorage.setItem.mockImplementation(async (key: string, value: unknown) => {
      storage.set(key, typeof value === "string" ? value : JSON.stringify(value));
    });
    const sessionPath = await writeSessionFile(sessionDir, [
      buildTurnContextLine(worktreePath),
      buildEventMessageLine("user_message", "Partial skill scan"),
      "x".repeat(300 * 1024),
      buildFunctionCallLine(),
    ]);

    const first = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    const skillLine = buildEventMessageLine(
      "agent_message",
      "review-by-sub-agents を使います。",
      "2026-05-03T10:00:00.000Z",
    );
    await appendFile(sessionPath, skillLine.slice(0, Math.floor(skillLine.length / 2)), "utf8");
    const second = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    await appendFile(sessionPath, `${skillLine.slice(Math.floor(skillLine.length / 2))}\n`, "utf8");

    const third = await loadTitlesForPaths(buildLoadArgs(codexHome, worktreePath));

    expect(first.get(worktreePath)?.[0]?.skillUsages).toEqual([]);
    expect(second.get(worktreePath)?.[0]?.skillUsages).toEqual([]);
    expect(third.get(worktreePath)?.[0]?.skillUsages).toEqual([
      { name: "review-by-sub-agents", timestamp: "2026-05-03T10:00:00.000Z" },
    ]);
  });
});

describe("loadLatestSessionAnswer", () => {
  it("最新のassistantメッセージを全文で返す", async () => {
    const { codexHome, worktreePath } = await setupTestPaths();
    try {
      const sessionDir = await createSessionDir(codexHome, new Date());
      const fullAnswer = ["Line 1", "Line 2", "Line 3"].join("\n");
      const sessionFile = await writeSessionFile(sessionDir, [
        buildTurnContextLine(worktreePath),
        buildResponseMessageLine("assistant", "First answer"),
        buildResponseMessageLine("assistant", fullAnswer),
      ]);

      const result = await loadLatestSessionAnswer({ filePath: sessionFile, homeDir: null });
      expect(result).toBe(fullAnswer);
    } finally {
      await rm(codexHome, { recursive: true, force: true });
      await rm(worktreePath, { recursive: true, force: true });
    }
  });

  it("assistantメッセージが無い場合はnullを返す", async () => {
    const { codexHome, worktreePath } = await setupTestPaths();
    try {
      const sessionDir = await createSessionDir(codexHome, new Date());
      const sessionFile = await writeSessionFile(sessionDir, [
        buildTurnContextLine(worktreePath),
        buildResponseMessageLine("user", "Only user message"),
      ]);

      const result = await loadLatestSessionAnswer({ filePath: sessionFile, homeDir: null });
      expect(result).toBeNull();
    } finally {
      await rm(codexHome, { recursive: true, force: true });
      await rm(worktreePath, { recursive: true, force: true });
    }
  });
});

describe("loadLatestSessionMessages", () => {
  it("最新のuser/assistantメッセージを新しい順で返す", async () => {
    const { codexHome, worktreePath } = await setupTestPaths();
    try {
      const sessionDir = await createSessionDir(codexHome, new Date());
      const firstAt = "2024-01-01T00:00:00.000Z";
      const secondAt = "2024-01-01T00:01:00.000Z";
      const thirdAt = "2024-01-01T00:02:00.000Z";
      const sessionFile = await writeSessionFile(sessionDir, [
        buildTurnContextLine(worktreePath),
        buildResponseMessageLine("user", "First question", firstAt),
        buildResponseMessageLine("assistant", "First answer", secondAt),
        buildResponseMessageLine("user", "Second question", thirdAt),
      ]);

      const result = await loadLatestSessionMessages({ filePath: sessionFile, homeDir: null });

      expect(result).toEqual([
        { role: "assistant", text: "First answer", timestamp: secondAt },
        { role: "user", text: "Second question", timestamp: thirdAt },
      ]);
    } finally {
      await rm(codexHome, { recursive: true, force: true });
      await rm(worktreePath, { recursive: true, force: true });
    }
  });

  it("event_msgのuser/agentメッセージを拾う", async () => {
    const { codexHome, worktreePath } = await setupTestPaths();
    try {
      const sessionDir = await createSessionDir(codexHome, new Date());
      const firstAt = "2024-01-01T01:00:00.000Z";
      const secondAt = "2024-01-01T01:01:00.000Z";
      const sessionFile = await writeSessionFile(sessionDir, [
        buildEventMessageLine("user_message", "Event user", firstAt),
        buildEventMessageLine("agent_message", "Event agent", secondAt),
      ]);

      const result = await loadLatestSessionMessages({ filePath: sessionFile, homeDir: null });

      expect(result).toEqual([
        { role: "user", text: "Event user", timestamp: firstAt },
        { role: "assistant", text: "Event agent", timestamp: secondAt },
      ]);
    } finally {
      await rm(codexHome, { recursive: true, force: true });
      await rm(worktreePath, { recursive: true, force: true });
    }
  });

  it("片方しか無い場合は1件だけ返す", async () => {
    const { codexHome, worktreePath } = await setupTestPaths();
    try {
      const sessionDir = await createSessionDir(codexHome, new Date());
      const timestamp = "2024-01-01T02:00:00.000Z";
      const sessionFile = await writeSessionFile(sessionDir, [
        buildResponseMessageLine("assistant", "Only assistant", timestamp),
      ]);

      const result = await loadLatestSessionMessages({ filePath: sessionFile, homeDir: null });

      expect(result).toEqual([{ role: "assistant", text: "Only assistant", timestamp }]);
    } finally {
      await rm(codexHome, { recursive: true, force: true });
      await rm(worktreePath, { recursive: true, force: true });
    }
  });

  it("function_call 直前の commentary を最新assistantメッセージに採用しない", async () => {
    const { codexHome, worktreePath } = await setupTestPaths();
    try {
      const sessionDir = await createSessionDir(codexHome, new Date());
      const userAt = "2026-02-06T22:19:29.498Z";
      const ignoredAt = "2026-02-06T22:20:26.481Z";
      const sessionFile = await writeSessionFile(sessionDir, [
        buildResponseMessageLine("user", "セッション一覧でステータスカラー反映", userAt, "input_text"),
        buildResponseMessageLine("assistant", "中間報告", ignoredAt, "output_text", "commentary"),
        buildFunctionCallLine(),
      ]);

      const result = await loadLatestSessionMessages({ filePath: sessionFile, homeDir: null });

      expect(result).toEqual([{ role: "user", text: "セッション一覧でステータスカラー反映", timestamp: userAt }]);
    } finally {
      await rm(codexHome, { recursive: true, force: true });
      await rm(worktreePath, { recursive: true, force: true });
    }
  });
});

describe("loadSessionMessages", () => {
  it("全メッセージを古い順で返す", async () => {
    const { codexHome, worktreePath } = await setupTestPaths();
    try {
      const sessionDir = await createSessionDir(codexHome, new Date());
      const initialAt = "2024-01-02T00:00:00.000Z";
      const firstAt = "2024-01-02T00:01:00.000Z";
      const secondAt = "2024-01-02T00:02:00.000Z";
      const thirdAt = "2024-01-02T00:03:00.000Z";
      const sessionFile = await writeSessionFile(sessionDir, [
        buildTurnContextLine(worktreePath),
        buildResponseMessageLine("user", "Initial question", initialAt),
        buildResponseMessageLine("user", "First question", firstAt),
        buildEventMessageLine("agent_message", "First answer", secondAt),
        buildResponseMessageLine("user", "Second question", thirdAt),
      ]);

      const result = await loadSessionMessages({ filePath: sessionFile, homeDir: null });

      expect(result).toEqual([
        { role: "user", text: "First question", timestamp: firstAt },
        { role: "assistant", text: "First answer", timestamp: secondAt },
        { role: "user", text: "Second question", timestamp: thirdAt },
      ]);
    } finally {
      await rm(codexHome, { recursive: true, force: true });
      await rm(worktreePath, { recursive: true, force: true });
    }
  });

  it("event_msgとresponse_itemの重複をまとめる", async () => {
    const { codexHome, worktreePath } = await setupTestPaths();
    try {
      const sessionDir = await createSessionDir(codexHome, new Date());
      const initialAt = "2024-01-02T01:00:00.000Z";
      const firstAt = "2024-01-02T01:01:00.000Z";
      const secondAt = "2024-01-02T01:02:00.000Z";
      const sessionFile = await writeSessionFile(sessionDir, [
        buildTurnContextLine(worktreePath),
        buildResponseMessageLine("user", "Initial question", initialAt),
        buildEventMessageLine("user_message", "Same question", firstAt),
        buildResponseMessageLine("user", "Same question", firstAt),
        buildEventMessageLine("agent_message", "Same answer", secondAt),
        buildResponseMessageLine("assistant", "Same answer", secondAt),
      ]);

      const result = await loadSessionMessages({ filePath: sessionFile, homeDir: null });

      expect(result).toEqual([
        { role: "user", text: "Same question", timestamp: firstAt },
        { role: "assistant", text: "Same answer", timestamp: secondAt },
      ]);
    } finally {
      await rm(codexHome, { recursive: true, force: true });
      await rm(worktreePath, { recursive: true, force: true });
    }
  });

  it("最初のuserメッセージを除外する", async () => {
    const { codexHome, worktreePath } = await setupTestPaths();
    try {
      const sessionDir = await createSessionDir(codexHome, new Date());
      const firstAt = "2024-01-02T02:00:00.000Z";
      const secondAt = "2024-01-02T02:01:00.000Z";
      const thirdAt = "2024-01-02T02:02:00.000Z";
      const sessionFile = await writeSessionFile(sessionDir, [
        buildTurnContextLine(worktreePath),
        buildResponseMessageLine("user", "First question", firstAt),
        buildResponseMessageLine("assistant", "First answer", secondAt),
        buildResponseMessageLine("user", "Second question", thirdAt),
      ]);

      const result = await loadSessionMessages({ filePath: sessionFile, homeDir: null });

      expect(result).toEqual([
        { role: "assistant", text: "First answer", timestamp: secondAt },
        { role: "user", text: "Second question", timestamp: thirdAt },
      ]);
    } finally {
      await rm(codexHome, { recursive: true, force: true });
      await rm(worktreePath, { recursive: true, force: true });
    }
  });

  it("最初のassistant以降は同じuserメッセージも除外しない", async () => {
    const { codexHome, worktreePath } = await setupTestPaths();
    try {
      const sessionDir = await createSessionDir(codexHome, new Date());
      const firstAt = "2024-01-02T02:30:00.000Z";
      const secondAt = "2024-01-02T02:31:00.000Z";
      const thirdAt = "2024-01-02T02:32:00.000Z";
      const sessionFile = await writeSessionFile(sessionDir, [
        buildTurnContextLine(worktreePath),
        buildResponseMessageLine("user", "Same question", firstAt),
        buildResponseMessageLine("assistant", "First answer", secondAt),
        buildResponseMessageLine("user", "Same question", thirdAt),
      ]);

      const result = await loadSessionMessages({ filePath: sessionFile, homeDir: null });

      expect(result).toEqual([
        { role: "assistant", text: "First answer", timestamp: secondAt },
        { role: "user", text: "Same question", timestamp: thirdAt },
      ]);
    } finally {
      await rm(codexHome, { recursive: true, force: true });
      await rm(worktreePath, { recursive: true, force: true });
    }
  });

  it("指示を含むuserメッセージを除外する", async () => {
    const { codexHome, worktreePath } = await setupTestPaths();
    try {
      const sessionDir = await createSessionDir(codexHome, new Date());
      const initialAt = "2024-01-02T03:00:00.000Z";
      const instructionAt = "2024-01-02T03:01:00.000Z";
      const replyAt = "2024-01-02T03:02:00.000Z";
      const nextAt = "2024-01-02T03:03:00.000Z";
      const sessionFile = await writeSessionFile(sessionDir, [
        buildTurnContextLine(worktreePath),
        buildResponseMessageLine("user", "Initial question", initialAt),
        buildResponseMessageLine("user", "AGENTS.md instructions ... <INSTRUCTIONS>", instructionAt),
        buildResponseMessageLine("assistant", "Instruction reply", replyAt),
        buildResponseMessageLine("user", "Next question", nextAt),
      ]);

      const result = await loadSessionMessages({ filePath: sessionFile, homeDir: null });

      expect(result).toEqual([
        { role: "assistant", text: "Instruction reply", timestamp: replyAt },
        { role: "user", text: "Next question", timestamp: nextAt },
      ]);
    } finally {
      await rm(codexHome, { recursive: true, force: true });
      await rm(worktreePath, { recursive: true, force: true });
    }
  });

  it("画像タグを含むuserメッセージを除外する", async () => {
    const { codexHome, worktreePath } = await setupTestPaths();
    try {
      const sessionDir = await createSessionDir(codexHome, new Date());
      const initialAt = "2024-01-02T04:00:00.000Z";
      const imageTagAt = "2024-01-02T04:01:00.000Z";
      const messageAt = "2024-01-02T04:02:00.000Z";
      const replyAt = "2024-01-02T04:03:00.000Z";
      const sessionFile = await writeSessionFile(sessionDir, [
        buildTurnContextLine(worktreePath),
        buildResponseMessageLine("user", "Initial question", initialAt),
        buildEventMessageLine("user_message", "<image name=[Image #1]></image>With image", imageTagAt),
        buildResponseMessageLine("user", "With image", messageAt),
        buildResponseMessageLine("assistant", "Image reply", replyAt),
      ]);

      const result = await loadSessionMessages({ filePath: sessionFile, homeDir: null });

      expect(result).toEqual([
        { role: "user", text: "With image", timestamp: messageAt },
        { role: "assistant", text: "Image reply", timestamp: replyAt },
      ]);
    } finally {
      await rm(codexHome, { recursive: true, force: true });
      await rm(worktreePath, { recursive: true, force: true });
    }
  });

  it("environment_contextを含むuserメッセージを除外する", async () => {
    const { codexHome, worktreePath } = await setupTestPaths();
    try {
      const sessionDir = await createSessionDir(codexHome, new Date());
      const initialAt = "2024-01-02T05:00:00.000Z";
      const contextAt = "2024-01-02T05:01:00.000Z";
      const replyAt = "2024-01-02T05:02:00.000Z";
      const nextAt = "2024-01-02T05:03:00.000Z";
      const sessionFile = await writeSessionFile(sessionDir, [
        buildTurnContextLine(worktreePath),
        buildResponseMessageLine("user", "Initial question", initialAt),
        buildResponseMessageLine(
          "user",
          "<environment_context><cwd>/tmp/test</cwd><shell>zsh</shell></environment_context>",
          contextAt,
        ),
        buildResponseMessageLine("assistant", "Context reply", replyAt),
        buildResponseMessageLine("user", "Next question", nextAt),
      ]);

      const result = await loadSessionMessages({ filePath: sessionFile, homeDir: null });

      expect(result).toEqual([
        { role: "assistant", text: "Context reply", timestamp: replyAt },
        { role: "user", text: "Next question", timestamp: nextAt },
      ]);
    } finally {
      await rm(codexHome, { recursive: true, force: true });
      await rm(worktreePath, { recursive: true, force: true });
    }
  });

  it("turn_aborted と途中入力を除外して最後のuser入力だけを残す", async () => {
    const { codexHome, worktreePath } = await setupTestPaths();
    try {
      const sessionDir = await createSessionDir(codexHome, new Date());
      const initialAt = "2026-02-06T23:50:25.673Z";
      const aborted1At = "2026-02-06T23:50:26.711Z";
      const retryAt = "2026-02-06T23:50:40.495Z";
      const aborted2At = "2026-02-06T23:50:41.613Z";
      const finalAt = "2026-02-06T23:50:50.688Z";
      const answerAt = "2026-02-06T23:51:10.000Z";
      const sessionFile = await writeSessionFile(sessionDir, [
        buildTurnContextLine(worktreePath),
        buildResponseMessageLine("user", "まだ、途中の詳細な", initialAt),
        buildResponseMessageLine(
          "user",
          "<turn_aborted> The user interrupted the previous turn on purpose. </turn_aborted>",
          aborted1At,
        ),
        buildResponseMessageLine("user", "途中でやり直し", retryAt),
        buildResponseMessageLine(
          "user",
          "<turn_aborted> The user interrupted the previous turn on purpose. </turn_aborted>",
          aborted2At,
        ),
        buildResponseMessageLine(
          "user",
          "まだ、途中の詳細なメッセージが残ってしまっている。どう修正すればよいのだろうか。[Image #1]",
          finalAt,
        ),
        buildResponseMessageLine("assistant", "確認します", answerAt),
      ]);

      const result = await loadSessionMessages({ filePath: sessionFile, homeDir: null });

      expect(result).toEqual([
        {
          role: "user",
          text: "まだ、途中の詳細なメッセージが残ってしまっている。どう修正すればよいのだろうか。[Image #1]",
          timestamp: finalAt,
        },
        { role: "assistant", text: "確認します", timestamp: answerAt },
      ]);
    } finally {
      await rm(codexHome, { recursive: true, force: true });
      await rm(worktreePath, { recursive: true, force: true });
    }
  });

  it("turn_aborted を引用した通常のuserメッセージは除外しない", async () => {
    const { codexHome, worktreePath } = await setupTestPaths();
    try {
      const sessionDir = await createSessionDir(codexHome, new Date());
      const initialAt = "2026-02-06T23:54:40.000Z";
      const userAt = "2026-02-06T23:54:41.268Z";
      const assistantAt = "2026-02-06T23:55:32.619Z";
      const quotedText =
        "この状態で、今のセッションを開き直すと、貼ってくれたような途中詳細は落ちるはずです。\n" +
        "まだ残る場合は該当区間を貼ってください。\n" +
        "<turn_aborted> The user interrupted the previous turn on purpose. </turn_aborted>";
      const sessionFile = await writeSessionFile(sessionDir, [
        buildTurnContextLine(worktreePath),
        buildResponseMessageLine("user", "先頭入力", initialAt),
        buildResponseMessageLine("user", quotedText, userAt),
        buildResponseMessageLine("assistant", "妥当性評価:", assistantAt),
      ]);

      const result = await loadSessionMessages({ filePath: sessionFile, homeDir: null });

      expect(result).toEqual([
        { role: "user", text: quotedText, timestamp: userAt },
        { role: "assistant", text: "妥当性評価:", timestamp: assistantAt },
      ]);
    } finally {
      await rm(codexHome, { recursive: true, force: true });
      await rm(worktreePath, { recursive: true, force: true });
    }
  });

  it("function_call が続く途中 commentary を除外し終端 commentary は表示する", async () => {
    const { codexHome, worktreePath } = await setupTestPaths();
    try {
      const sessionDir = await createSessionDir(codexHome, new Date());
      const userAt = "2026-02-06T22:19:29.498Z";
      const ignoredAt = "2026-02-06T22:20:26.481Z";
      const keptFirstAt = "2026-02-06T22:20:39.858Z";
      const keptSecondAt = "2026-02-06T22:20:41.838Z";
      const sessionFile = await writeSessionFile(sessionDir, [
        buildResponseMessageLine("user", "セッション一覧でステータスカラー反映", userAt, "input_text"),
        buildResponseMessageLine("assistant", "中間報告", ignoredAt, "output_text", "commentary"),
        buildFunctionCallLine(),
        buildResponseMessageLine("assistant", "終端報告1", keptFirstAt, "output_text", "commentary"),
        buildResponseMessageLine("assistant", "終端報告2", keptSecondAt, "output_text", "commentary"),
      ]);

      const result = await loadSessionMessages({ filePath: sessionFile, homeDir: null });

      expect(result).toEqual([
        { role: "assistant", text: "終端報告1", timestamp: keptFirstAt },
        { role: "assistant", text: "終端報告2", timestamp: keptSecondAt },
      ]);
    } finally {
      await rm(codexHome, { recursive: true, force: true });
      await rm(worktreePath, { recursive: true, force: true });
    }
  });

  it("commentary の直後に final_answer が来たら時系列順で保持する", async () => {
    const { codexHome, worktreePath } = await setupTestPaths();
    try {
      const sessionDir = await createSessionDir(codexHome, new Date());
      const userAt = "2026-02-07T00:00:00.000Z";
      const commentaryAt = "2026-02-07T00:00:01.000Z";
      const finalAt = "2026-02-07T00:00:02.000Z";
      const sessionFile = await writeSessionFile(sessionDir, [
        buildResponseMessageLine("user", "質問", userAt, "input_text"),
        buildResponseMessageLine("assistant", "途中報告", commentaryAt, "output_text", "commentary"),
        buildResponseMessageLine("assistant", "最終回答", finalAt, "output_text", "final_answer"),
      ]);

      const result = await loadSessionMessages({ filePath: sessionFile, homeDir: null });

      expect(result).toEqual([
        { role: "assistant", text: "途中報告", timestamp: commentaryAt },
        { role: "assistant", text: "最終回答", timestamp: finalAt },
      ]);
    } finally {
      await rm(codexHome, { recursive: true, force: true });
      await rm(worktreePath, { recursive: true, force: true });
    }
  });

  it("turn_aborted がなければ連続する user メッセージを保持する", async () => {
    const { codexHome, worktreePath } = await setupTestPaths();
    try {
      const sessionDir = await createSessionDir(codexHome, new Date());
      const initialAt = "2026-02-07T00:01:00.000Z";
      const firstAt = "2026-02-07T00:01:01.000Z";
      const secondAt = "2026-02-07T00:01:02.000Z";
      const assistantAt = "2026-02-07T00:01:03.000Z";
      const sessionFile = await writeSessionFile(sessionDir, [
        buildResponseMessageLine("user", "先頭入力", initialAt, "input_text"),
        buildResponseMessageLine("user", "補足1", firstAt, "input_text"),
        buildResponseMessageLine("user", "補足2", secondAt, "input_text"),
        buildResponseMessageLine("assistant", "回答", assistantAt, "output_text", "final_answer"),
      ]);

      const result = await loadSessionMessages({ filePath: sessionFile, homeDir: null });

      expect(result).toEqual([
        { role: "user", text: "補足1", timestamp: firstAt },
        { role: "user", text: "補足2", timestamp: secondAt },
        { role: "assistant", text: "回答", timestamp: assistantAt },
      ]);
    } finally {
      await rm(codexHome, { recursive: true, force: true });
      await rm(worktreePath, { recursive: true, force: true });
    }
  });
});

describe("findLatestSessionFileByPath", () => {
  it("review サブエージェントのセッションを最新検索に含める", async () => {
    const { codexHome, worktreePath } = await setupTestPaths();
    try {
      const now = new Date();
      const sessionDir = await createSessionDir(codexHome, now);
      const title = "Review the current code changes (staged, unstaged, and untracked files)";

      const normalFile = await writeSessionFile(
        sessionDir,
        [buildSessionMetaLine("cli"), ...buildReviewLines(worktreePath, title, "Latest review message.")],
        "normal-latest.jsonl",
      );
      const subagentFile = await writeSessionFile(
        sessionDir,
        [
          buildSessionMetaLine({ subagent: "review" }),
          ...buildReviewLines(worktreePath, title, "Latest review message."),
        ],
        "subagent-latest.jsonl",
      );

      const normalTime = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const subagentTime = new Date(now.getTime() - 1 * 60 * 60 * 1000);
      await utimes(normalFile, normalTime, normalTime);
      await utimes(subagentFile, subagentTime, subagentTime);

      const result = await findLatestSessionFileByPath(buildFindLatestArgs(codexHome, worktreePath));
      expect(result).toBe(subagentFile);
    } finally {
      await rm(codexHome, { recursive: true, force: true });
      await rm(worktreePath, { recursive: true, force: true });
    }
  });

  it("review 以外のサブエージェントのセッションを最新検索から除外する", async () => {
    const { codexHome, worktreePath } = await setupTestPaths();
    try {
      const now = new Date();
      const sessionDir = await createSessionDir(codexHome, now);
      const title = "Review the current code changes (staged, unstaged, and untracked files)";

      const normalFile = await writeSessionFile(
        sessionDir,
        [buildSessionMetaLine("cli"), ...buildReviewLines(worktreePath, title, "Latest review message.")],
        "normal-latest-worker.jsonl",
      );
      const subagentFile = await writeSessionFile(
        sessionDir,
        [
          buildSessionMetaLine({ subagent: "worker" }),
          ...buildReviewLines(worktreePath, title, "Latest review message."),
        ],
        "worker-subagent-latest.jsonl",
      );

      const normalTime = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const subagentTime = new Date(now.getTime() - 1 * 60 * 60 * 1000);
      await utimes(normalFile, normalTime, normalTime);
      await utimes(subagentFile, subagentTime, subagentTime);

      const result = await findLatestSessionFileByPath(buildFindLatestArgs(codexHome, worktreePath));
      expect(result).toBe(normalFile);
    } finally {
      await rm(codexHome, { recursive: true, force: true });
      await rm(worktreePath, { recursive: true, force: true });
    }
  });

  it("source が subagent 文字列のセッションを最新検索から除外する", async () => {
    const { codexHome, worktreePath } = await setupTestPaths();
    try {
      const now = new Date();
      const sessionDir = await createSessionDir(codexHome, now);
      const title = "Review the current code changes (staged, unstaged, and untracked files)";

      const normalFile = await writeSessionFile(
        sessionDir,
        [buildSessionMetaLine("cli"), ...buildReviewLines(worktreePath, title, "Latest review message.")],
        "normal-source-string-latest.jsonl",
      );
      const subagentFile = await writeSessionFile(
        sessionDir,
        [buildSessionMetaLine("subagent"), ...buildReviewLines(worktreePath, title, "Latest review message.")],
        "subagent-source-string-latest.jsonl",
      );

      const normalTime = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const subagentTime = new Date(now.getTime() - 1 * 60 * 60 * 1000);
      await utimes(normalFile, normalTime, normalTime);
      await utimes(subagentFile, subagentTime, subagentTime);

      const result = await findLatestSessionFileByPath(buildFindLatestArgs(codexHome, worktreePath));
      expect(result).toBe(normalFile);
    } finally {
      await rm(codexHome, { recursive: true, force: true });
      await rm(worktreePath, { recursive: true, force: true });
    }
  });

  it("source.subagent.thread_spawn のセッションを最新検索から除外する", async () => {
    const { codexHome, worktreePath } = await setupTestPaths();
    try {
      const now = new Date();
      const sessionDir = await createSessionDir(codexHome, now);
      const title = "Review the current code changes (staged, unstaged, and untracked files)";

      const normalFile = await writeSessionFile(
        sessionDir,
        [buildSessionMetaLine("cli"), ...buildReviewLines(worktreePath, title, "Latest review message.")],
        "normal-thread-spawn-source-latest.jsonl",
      );
      const threadSpawnFile = await writeSessionFile(
        sessionDir,
        [
          buildSessionMetaLine({
            subagent: {
              thread_spawn: {
                parent_thread_id: "thread_parent_001",
              },
            },
          }),
          ...buildReviewLines(worktreePath, title, "Latest review message."),
        ],
        "thread-spawn-source-latest.jsonl",
      );

      const normalTime = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const threadSpawnTime = new Date(now.getTime() - 1 * 60 * 60 * 1000);
      await utimes(normalFile, normalTime, normalTime);
      await utimes(threadSpawnFile, threadSpawnTime, threadSpawnTime);

      const result = await findLatestSessionFileByPath(buildFindLatestArgs(codexHome, worktreePath));
      expect(result).toBe(normalFile);
    } finally {
      await rm(codexHome, { recursive: true, force: true });
      await rm(worktreePath, { recursive: true, force: true });
    }
  });
});

describe("findFirstSessionFileByPath", () => {
  it("指定パスに紐づく最初のセッションを返す", async () => {
    const { codexHome, worktreePath } = await setupTestPaths();
    try {
      const now = new Date();
      const sessionDir = await createSessionDir(codexHome, now);
      const firstFile = await writeSessionFile(
        sessionDir,
        [
          buildTurnContextLine(worktreePath),
          buildEventMessageLine("user_message", "first", "2026-02-07T00:00:00.000Z"),
        ],
        "rollout-2026-02-07T00-00-00-019dd94f-0000-7000-8000-000000000001.jsonl",
      );
      const secondFile = await writeSessionFile(
        sessionDir,
        [
          buildTurnContextLine(worktreePath),
          buildEventMessageLine("user_message", "second", "2026-02-07T00:10:00.000Z"),
        ],
        "rollout-2026-02-07T00-10-00-019dd94f-0000-7000-8000-000000000002.jsonl",
      );
      const firstTime = new Date(now.getTime() - 1 * 60 * 60 * 1000);
      const secondTime = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      await utimes(firstFile, firstTime, firstTime);
      await utimes(secondFile, secondTime, secondTime);

      const result = await findFirstSessionFileByPath(buildFindLatestArgs(codexHome, worktreePath));

      expect(result).toBe(firstFile);
    } finally {
      await rm(codexHome, { recursive: true, force: true });
      await rm(worktreePath, { recursive: true, force: true });
    }
  });
});
