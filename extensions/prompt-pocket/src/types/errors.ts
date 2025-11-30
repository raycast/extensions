/**
 * アプリケーション全体で使用するエラー型
 */
export class PromptManagerError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "PromptManagerError";
  }
}

/**
 * エラーコード
 */
export enum ErrorCode {
  STORAGE_READ_FAILED = "STORAGE_READ_FAILED",
  STORAGE_WRITE_FAILED = "STORAGE_WRITE_FAILED",
  PROMPT_NOT_FOUND = "PROMPT_NOT_FOUND",
  VALIDATION_FAILED = "VALIDATION_FAILED",
  CLIPBOARD_FAILED = "CLIPBOARD_FAILED",
  CURSOR_MOVE_FAILED = "CURSOR_MOVE_FAILED",
  UNKNOWN = "UNKNOWN",
}

/**
 * エラーを PromptManagerError に変換
 */
export function toPromptManagerError(
  error: unknown,
  defaultCode: ErrorCode,
): PromptManagerError {
  if (error instanceof PromptManagerError) {
    return error;
  }

  if (error instanceof Error) {
    return new PromptManagerError(error.message, defaultCode, error);
  }

  return new PromptManagerError(String(error), defaultCode, error);
}

/**
 * ユーザーフレンドリーなエラーメッセージを取得
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof PromptManagerError) {
    switch (error.code) {
      case ErrorCode.STORAGE_READ_FAILED:
        return "Failed to load data. Please try again.";
      case ErrorCode.STORAGE_WRITE_FAILED:
        return "Failed to save data. Please check your storage.";
      case ErrorCode.PROMPT_NOT_FOUND:
        return "Prompt not found. It may have been deleted.";
      case ErrorCode.VALIDATION_FAILED:
        return error.message;
      case ErrorCode.CLIPBOARD_FAILED:
        return "Failed to access clipboard. Please check permissions.";
      case ErrorCode.CURSOR_MOVE_FAILED:
        return "Failed to move cursor. Text was pasted successfully.";
      default:
        return "An unexpected error occurred.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unknown error occurred.";
}
