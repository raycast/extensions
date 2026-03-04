export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 100;

const KNOWN_ERROR_CODES = [
  "BAD_REQUEST",
  "INTERNAL_ERROR",
  "INVALID_API_KEY",
  "INVALID_INPUT",
  "METHOD_NOT_ALLOWED",
  "MISSING_API_KEY",
  "NETWORK_ERROR",
  "RATE_LIMITED",
  "REQUEST_FAILED",
  "UNAUTHORIZED",
] as const;

export type RaycastApiErrorCode = (typeof KNOWN_ERROR_CODES)[number];

const isKnownErrorCode = (
  value: string | undefined,
): value is RaycastApiErrorCode => {
  return (
    Boolean(value) && KNOWN_ERROR_CODES.includes(value as RaycastApiErrorCode)
  );
};

const getErrorMessage = (code: RaycastApiErrorCode): string => {
  switch (code) {
    case "MISSING_API_KEY":
      return "Set your Teak API key in extension preferences to continue.";
    case "INVALID_API_KEY":
    case "UNAUTHORIZED":
      return "Your Teak API key is invalid or revoked. Generate a new key in Teak Settings > API Keys.";
    case "RATE_LIMITED":
      return "Too many requests right now. Please wait a moment and try again.";
    case "NETWORK_ERROR":
      return "Unable to reach Teak. Check your internet connection and try again.";
    case "INVALID_INPUT":
    case "BAD_REQUEST":
      return "The request could not be processed. Please check your input and try again.";
    case "METHOD_NOT_ALLOWED":
      return "This command is temporarily unavailable. Please update the extension and retry.";
    case "INTERNAL_ERROR":
    case "REQUEST_FAILED":
      return "Teak is temporarily unavailable. Please try again shortly.";
    default:
      return "Request failed. Please try again.";
  }
};

export const normalizeLimit = (limit?: number): number => {
  if (!Number.isFinite(limit)) {
    return DEFAULT_LIMIT;
  }

  const clamped = Math.trunc(limit ?? DEFAULT_LIMIT);
  return Math.max(1, Math.min(clamped, MAX_LIMIT));
};

export const buildCardsSearchParams = (
  query: string,
  limit = DEFAULT_LIMIT,
): string => {
  const search = new URLSearchParams();
  const trimmedQuery = query.trim();

  if (trimmedQuery) {
    search.set("q", trimmedQuery);
  }

  search.set("limit", String(normalizeLimit(limit)));
  return search.toString();
};

export const toErrorCode = (
  payloadCode: string | undefined,
  fallback: RaycastApiErrorCode,
): RaycastApiErrorCode => {
  return isKnownErrorCode(payloadCode) ? payloadCode : fallback;
};

export class RaycastApiError extends Error {
  code: RaycastApiErrorCode;
  status?: number;

  constructor(code: RaycastApiErrorCode, status?: number) {
    super(getErrorMessage(code));
    this.name = "RaycastApiError";
    this.code = code;
    this.status = status;
  }
}

export const getUserFacingErrorMessage = (error: unknown): string => {
  if (error instanceof RaycastApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return getErrorMessage("REQUEST_FAILED");
};

export const getRecoveryHint = (error: unknown): string | null => {
  if (!(error instanceof RaycastApiError)) {
    return null;
  }

  switch (error.code) {
    case "INVALID_API_KEY":
    case "UNAUTHORIZED":
    case "MISSING_API_KEY":
      return "Open extension preferences and set a valid API key.";
    case "RATE_LIMITED":
      return "Wait a few seconds, then retry.";
    case "NETWORK_ERROR":
      return "Check network connectivity, then retry.";
    default:
      return null;
  }
};
