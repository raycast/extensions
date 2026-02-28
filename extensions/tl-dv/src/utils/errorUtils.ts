export function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === "string") {
    return new Error(error);
  }

  if (error && typeof error === "object" && "message" in error) {
    return new Error(String(error.message));
  }

  return new Error("Unknown error occurred");
}

export function toErrorMessage(error: unknown): string {
  return toError(error).message;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
