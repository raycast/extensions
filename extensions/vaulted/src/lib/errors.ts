export type ErrorCode =
  | "API_UNREACHABLE"
  | "API_ERROR"
  | "INVALID_INPUT"
  | "SECRET_NOT_FOUND"
  | "SECRET_EXPIRED"
  | "PASSPHRASE_REQUIRED"
  | "PASSPHRASE_INVALID"
  | "ENCRYPTION_FAILED"
  | "INVALID_URL"
  | "INVALID_HOST"
  | "PAYLOAD_TOO_LARGE";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: ErrorCode,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export function toMessage(err: unknown): string {
  if (err instanceof ApiError || err instanceof ValidationError) {
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}
