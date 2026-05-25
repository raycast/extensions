import { worktreeOpenAppService } from "../domain/worktree-open-app.service";
import type { SessionMessage } from "../domain/session-detail.service";
import type { WorktreeDeckContext } from "./list-worktrees.usecase";

/**
 * session file 操作の依存ポート
 */
export type WorktreeSessionFileDependencies = {
  findFirstSessionFileByPath(args: WorktreeDeckContext & { path: string }): Promise<string | null>;
  findLatestSessionFileByPath(args: WorktreeDeckContext & { path: string }): Promise<string | null>;
  saveCodexThreadIdForWorktreePath(path: string, threadId: string): Promise<void>;
  openPathInConfiguredIde(path: string): Promise<void>;
  loadLatestSessionMessages(args: { filePath: string; homeDir: string | null }): Promise<SessionMessage[]>;
  loadSessionMessages(args: { filePath: string; homeDir: string | null }): Promise<SessionMessage[]>;
};

/**
 * 最新 session file を開いた結果
 */
type OpenLatestSessionFileResult =
  | { status: "path-empty" }
  | { status: "not-found" }
  | { status: "opened"; sessionPath: string };

/**
 * worktree から Codex thread id を補完する
 */
async function resolveAndSaveCodexThreadId(args: {
  worktreePath: string;
  context: WorktreeDeckContext;
  dependencies: WorktreeSessionFileDependencies;
}): Promise<{ worktreePath: string; threadId: string; sessionPath: string } | null> {
  const worktreePath = args.worktreePath.trim();
  if (!worktreePath) {
    return null;
  }
  const sessionPath = await args.dependencies.findFirstSessionFileByPath({
    ...args.context,
    path: worktreePath,
  });
  const threadId =
    sessionPath !== null && sessionPath.length > 0
      ? worktreeOpenAppService.extractThreadIdFromSessionPath(sessionPath)
      : null;
  if (threadId === null || sessionPath === null) {
    return null;
  }
  await args.dependencies.saveCodexThreadIdForWorktreePath(worktreePath, threadId);
  return { worktreePath, threadId, sessionPath };
}

/**
 * 指定 worktree の最新 session file を IDE で開く
 */
async function openLatestSessionFile(args: {
  worktreePath: string;
  context: WorktreeDeckContext;
  dependencies: WorktreeSessionFileDependencies;
}): Promise<OpenLatestSessionFileResult> {
  const worktreePath = args.worktreePath.trim();
  if (!worktreePath) {
    return { status: "path-empty" };
  }
  const sessionPath = await args.dependencies.findLatestSessionFileByPath({
    ...args.context,
    path: worktreePath,
  });
  if (sessionPath === null || sessionPath.length === 0) {
    return { status: "not-found" };
  }
  await args.dependencies.openPathInConfiguredIde(sessionPath);
  return { status: "opened", sessionPath };
}

/**
 * session detail の最新メッセージを読み込む
 */
function loadLatestMessages(args: {
  filePath: string;
  homeDir: string | null;
  dependencies: WorktreeSessionFileDependencies;
}): Promise<SessionMessage[]> {
  return args.dependencies.loadLatestSessionMessages({ filePath: args.filePath, homeDir: args.homeDir });
}

/**
 * session detail の全メッセージを読み込む
 */
function loadMessages(args: {
  filePath: string;
  homeDir: string | null;
  dependencies: WorktreeSessionFileDependencies;
}): Promise<SessionMessage[]> {
  return args.dependencies.loadSessionMessages({ filePath: args.filePath, homeDir: args.homeDir });
}

/**
 * worktree session file ユースケース関数群
 */
export const worktreeSessionFileUsecase = {
  loadLatestMessages,
  loadMessages,
  openLatestSessionFile,
  resolveAndSaveCodexThreadId,
} as const;
