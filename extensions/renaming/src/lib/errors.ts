/**
 * Structured error types with user-friendly messages.
 */

import { ErrorCode } from "../types/enums";

export abstract class RenamingError extends Error {
  abstract readonly code: ErrorCode;
  abstract readonly userMessage: string;

  constructor(
    message: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class FileNotFoundError extends RenamingError {
  readonly code = ErrorCode.FILE_NOT_FOUND;
  readonly userMessage = "Source file no longer exists.";

  constructor(filePath: string) {
    super(`File not found: ${filePath}`, { filePath });
  }
}

export class PermissionError extends RenamingError {
  readonly code = ErrorCode.PERMISSION_DENIED;
  readonly userMessage = "Permission denied. Check file permissions.";

  constructor(filePath: string, originalError?: Error) {
    super(`Permission denied: ${filePath}`, {
      filePath,
      originalError: originalError?.message,
    });
  }
}

export class ConflictError extends RenamingError {
  readonly code = ErrorCode.CONFLICT;
  readonly userMessage = "Target filename already exists.";

  constructor(targetName: string, filePath: string) {
    super(`Target "${targetName}" already exists`, { targetName, filePath });
  }
}

export class ValidationError extends RenamingError {
  readonly code = ErrorCode.VALIDATION;

  get userMessage() {
    return this.message;
  }

  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message, { field });
  }
}

export class PathTraversalError extends RenamingError {
  readonly code = ErrorCode.PATH_TRAVERSAL;
  readonly userMessage = "Rename would move file to a different directory.";

  constructor(oldPath: string, newPath: string) {
    super(`Path traversal detected: ${oldPath} -> ${newPath}`, { oldPath, newPath });
  }
}

export function isRenamingError(error: unknown): error is RenamingError {
  return error instanceof RenamingError;
}

export function getUserFriendlyErrorMessage(error: unknown): string {
  if (isRenamingError(error)) return error.userMessage;
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred";
}
