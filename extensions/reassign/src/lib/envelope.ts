import type { ApiError, ClientCode } from "./api";
import type { ErrorCode } from "./wire";

// Pure readers for the batch envelope and the error codes. They live apart from
// the fetch client, so a test that mocks the client still gets the real ones.

export interface BatchResultRow {
  index: number;
  status: "ok" | "error" | "skipped";
  result?: unknown;
  error?: { code: string; message: string };
  reason?: string;
}

export interface BatchReceipt {
  results: BatchResultRow[];
  undoToken?: string;
  expiresAt?: string; // ISO instant; the undo window ends here
}

/** The first rejected row of a batch, or undefined when every op applied. */
export function batchFailure(receipt: { results?: BatchResultRow[] } | undefined): BatchResultRow | undefined {
  return receipt?.results?.find((row) => row.status === "error");
}

/** The ApiError for a rejected row inside a 2xx batch. */
export function rowError(row: BatchResultRow): ApiError {
  return {
    ok: false,
    code: toClientCode(row.error?.code, 422),
    message: row.error?.message ?? "The server rejected the change.",
  };
}

export function toClientCode(code: string | undefined, status: number): ClientCode {
  const known: ErrorCode[] = [
    "unauthorized",
    "permission",
    "scope",
    "read_only",
    "not_found",
    "validation",
    "conflict",
    "batch_rejected",
    "rate_limited",
    "internal",
  ];
  if (code && (known as string[]).includes(code)) return code as ErrorCode;
  if (status === 429) return "rate_limited";
  if (status === 503) return "internal";
  if (status === 401) return "unauthorized";
  if (status === 422) return "validation";
  return "internal";
}
