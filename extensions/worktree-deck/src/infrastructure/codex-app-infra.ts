import { execFile } from "node:child_process";
import { delimiter } from "node:path";
import { promisify } from "node:util";
import { worktreeOpenAppService } from "../domain/worktree-open-app.service";
import { normalizeExternalCommandError } from "./external-command-error";

/**
 * execFile を Promise 化した互換関数
 */
type ExecFileImpl = (file: string, args: string[], options?: Parameters<typeof execFileAsync>[2]) => Promise<unknown>;

/**
 * codex コマンドを Promise で扱うラッパー
 */
const execFileAsync = promisify(execFile);

/**
 * PATHに追加する代表的な検索ディレクトリ
 */
const DEFAULT_COMMAND_PATHS = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", "/usr/sbin", "/sbin"];

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
 * Codex App で指定パスを開く
 */
export async function openPathInCodexApp(path: string, execFileImpl: ExecFileImpl = execFileAsync): Promise<void> {
  const trimmedPath = path.trim();
  if (!trimmedPath) {
    throw new Error("Worktree path is required.");
  }
  const envPath = buildCommandPath(process.env.PATH);
  try {
    await execFileImpl("codex", ["app", trimmedPath], {
      cwd: trimmedPath,
      env: {
        ...process.env,
        PATH: envPath,
      },
    });
  } catch (error) {
    throw normalizeExternalCommandError(error, "codex", "codex-action");
  }
}

/**
 * Codex App で指定 thread を開く
 */
export async function openCodexThreadInApp(
  threadId: string,
  execFileImpl: ExecFileImpl = execFileAsync,
): Promise<void> {
  const url = worktreeOpenAppService.buildCodexThreadUrl(threadId);
  if (url === null) {
    throw new Error("Thread id is invalid.");
  }
  await execFileImpl("open", [url]);
}
