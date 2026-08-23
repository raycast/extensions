export type MobbinErrorCode =
  | "missing-api-key"
  | "invalid-api-key"
  | "plan-required"
  | "rate-limited"
  | "bad-request"
  | "invalid-query"
  | "not-found"
  | "server-error"
  | "network-error"
  | "timeout"
  | "oauth-required"
  | "mcp-tool-not-found"
  | "mcp-error"
  | "contract-mismatch"
  | "unsupported-kind"
  | "unknown";

export class MobbinError extends Error {
  constructor(
    message: string,
    readonly code: MobbinErrorCode,
    readonly details?: {
      status?: number;
      serverCode?: string;
      retryAfterSeconds?: number;
      safeKeys?: string[];
    },
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
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

export function abortError(reason?: unknown): Error {
  if (reason instanceof Error) return reason;
  return new DOMException("The operation was aborted.", "AbortError");
}

export function validateSearchQuery(query: string): string {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    throw new MobbinError("Enter a Mobbin search query.", "invalid-query");
  }
  if (trimmed.length > 500) {
    throw new MobbinError(
      "Mobbin search queries must be 500 characters or fewer.",
      "invalid-query",
    );
  }
  return trimmed;
}
