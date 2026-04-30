import { GETNOTE_BASE_URL } from "./constants";
import { GetNoteApiErrorPayload } from "./types";

export class GetNoteError extends Error {
  code?: number;
  reason?: string;
  requestId?: string;

  constructor(message: string, options?: { code?: number; reason?: string; requestId?: string }) {
    super(message);
    this.name = "GetNoteError";
    this.code = options?.code;
    this.reason = options?.reason;
    this.requestId = options?.requestId;
  }
}

export class GetNoteAuthError extends GetNoteError {
  constructor(message = "GetNote is not connected. Run a GetNote command to authorize first.") {
    super(message, { code: 10001 });
    this.name = "GetNoteAuthError";
  }
}

export function normalizeGetNoteError(error: unknown): string {
  if (error instanceof GetNoteAuthError) {
    return error.message;
  }

  if (error instanceof GetNoteError) {
    if (error.reason === "not_member" || error.code === 10201) {
      return "This account cannot use the GetNote OpenAPI yet. Please confirm the membership status.";
    }

    if (error.reason === "quota_day" || error.reason === "quota_month" || error.code === 42900) {
      return "The GetNote API quota has been reached. Please try again later.";
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unknown error occurred. Please try again later.";
}

export function buildApiError(payload: GetNoteApiErrorPayload | null | undefined, requestId?: string): GetNoteError {
  const message = payload?.message || "GetNote API request failed";

  if (payload?.code === 10001) {
    return new GetNoteAuthError(`${message}. Please reconnect GetNote.`);
  }

  return new GetNoteError(message, {
    code: payload?.code,
    reason: payload?.reason,
    requestId,
  });
}

export function createRequestError(endpoint: string, status: number): GetNoteError {
  return new GetNoteError(`Request to ${GETNOTE_BASE_URL}${endpoint} failed (HTTP ${status}).`);
}
