/**
 * 外部コマンドの利用場面を表す
 */
export type ExternalCommandPurpose = "git-worktree" | "pull-request" | "codex-action";

/**
 * command 未検出時の Node.js エラー形状
 */
type MissingCommandErrorLike = {
  code?: unknown;
  syscall?: unknown;
  path?: unknown;
  message?: unknown;
};

/**
 * 外部コマンド未導入を表す専用エラー
 */
export class ExternalCommandNotFoundError extends Error {
  readonly command: string;

  constructor(command: string, purpose: ExternalCommandPurpose) {
    super(formatMissingExternalCommandMessage(command, purpose));
    this.name = "ExternalCommandNotFoundError";
    this.command = command;
  }
}

/**
 * unknown を Node.js の command 未検出エラーとして扱えるか判定する
 */
export function isMissingExternalCommandError(error: unknown, command?: string): boolean {
  if (error instanceof ExternalCommandNotFoundError) {
    return command === undefined || error.command === command;
  }
  if (error === null || typeof error !== "object") {
    return false;
  }
  const payload = error as MissingCommandErrorLike;
  if (payload.code !== "ENOENT") {
    return false;
  }
  if (!command) {
    return true;
  }
  const syscall = typeof payload.syscall === "string" ? payload.syscall : "";
  const path = typeof payload.path === "string" ? payload.path : "";
  const message = typeof payload.message === "string" ? payload.message : "";
  return syscall.includes(command) || path === command || message.includes(command);
}

/**
 * command 未検出時のユーザー向け案内文を返す
 */
export function formatMissingExternalCommandMessage(command: string, purpose: ExternalCommandPurpose): string {
  switch (purpose) {
    case "git-worktree":
      return "Git is required to manage worktrees. Install Git and ensure it is available in PATH.";
    case "pull-request":
      return "GitHub CLI (gh) is required to create pull requests. Install gh and run gh auth login.";
    case "codex-action":
      return "Codex CLI is required for Codex actions. Install Codex and ensure it is available in PATH.";
    default:
      return `${command} command was not found in PATH.`;
  }
}

/**
 * 外部コマンド未導入エラーだけを明確な案内文へ変換する
 */
export function normalizeExternalCommandError(
  error: unknown,
  command: string,
  purpose: ExternalCommandPurpose,
): unknown {
  if (isMissingExternalCommandError(error, command)) {
    return new ExternalCommandNotFoundError(command, purpose);
  }
  return error;
}
