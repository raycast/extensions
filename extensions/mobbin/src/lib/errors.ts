export class MobbinError extends Error {
  constructor(
    message: string,
    readonly code:
      | "missing-api-key"
      | "invalid-api-key"
      | "plan-required"
      | "rate-limited"
      | "bad-request"
      | "not-found"
      | "server-error"
      | "network-error"
      | "oauth-required"
      | "mcp-tool-not-found"
      | "mcp-error"
      | "unknown",
    readonly details?: { status?: number; retryAfterSeconds?: number },
  ) {
    super(message);
    this.name = "MobbinError";
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
