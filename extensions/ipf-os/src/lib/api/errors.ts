export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL_SERVER_ERROR"
  | (string & {});

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(status: number, code: ApiErrorCode, message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }

  get isAuthFailure(): boolean {
    return this.status === 401;
  }

  get isTerminal(): boolean {
    return this.status === 403 || this.status === 404 || this.status === 409;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const readFieldErrors = (body: Record<string, unknown>): Record<string, string[]> | undefined => {
  if (!isRecord(body.errors)) return undefined;

  const result: Record<string, string[]> = {};
  for (const [field, value] of Object.entries(body.errors)) {
    if (Array.isArray(value)) {
      result[field] = value.map(String);
    } else if (typeof value === "string") {
      result[field] = [value];
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
};

const truncate = (value: string, max = 200): string => (value.length > max ? `${value.slice(0, max)}…` : value);

export function toApiError(status: number, body: unknown, fallbackMessage: string): ApiError {
  if (typeof body === "string" && body.trim().length > 0) {
    return new ApiError(status, String(status), `HTTP ${status}: ${truncate(body.trim())}`);
  }

  if (!isRecord(body)) {
    return new ApiError(status, String(status), `${fallbackMessage} (HTTP ${status})`);
  }

  const message = typeof body.message === "string" && body.message.trim().length > 0 ? body.message : fallbackMessage;
  const code = typeof body.code === "string" ? body.code : String(status);

  return new ApiError(status, code, message, readFieldErrors(body));
}

export function describeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}
