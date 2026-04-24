export const ErrorCode = {
  INTERNAL_ERROR: "INTERNAL_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  WORKSPACE_NOT_FOUND: "WORKSPACE_NOT_FOUND",
  PATH_TRAVERSAL: "PATH_TRAVERSAL",
  SESSION_PARSE_FAILED: "SESSION_PARSE_FAILED",
  SOURCE_PARSE_FAILED: "SOURCE_PARSE_FAILED",
  SKILL_PARSE_FAILED: "SKILL_PARSE_FAILED",
  DEEPLINK_BUILD_FAILED: "DEEPLINK_BUILD_FAILED",
  DEEPLINK_OPEN_FAILED: "DEEPLINK_OPEN_FAILED",
  APP_NOT_INSTALLED: "APP_NOT_INSTALLED",
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

export class AppError extends Error {
  public readonly code: ErrorCodeType;
  public readonly details?: unknown;

  constructor(code: ErrorCodeType, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static validation(message: string, details?: unknown): AppError {
    return new AppError(ErrorCode.VALIDATION_ERROR, message, details);
  }

  static parse(code: ErrorCodeType, message: string, details?: unknown): AppError {
    return new AppError(code, message, details);
  }

  static internal(message = "Internal error", details?: unknown): AppError {
    return new AppError(ErrorCode.INTERNAL_ERROR, message, details);
  }

  toJSON(): { name: string; code: ErrorCodeType; message: string; details?: unknown } {
    return { name: this.name, code: this.code, message: this.message, details: this.details };
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
