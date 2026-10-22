const KNOWN_ERROR_CODES = [
  "BAD_REQUEST",
  "CONFIG_ERROR",
  "DEV_API_UNAVAILABLE",
  "FOLDER_EXISTS",
  "FOLDER_LIMIT",
  "INTERNAL_ERROR",
  "INVALID_API_KEY",
  "INVALID_INPUT",
  "METHOD_NOT_ALLOWED",
  "MISSING_API_KEY",
  "NETWORK_ERROR",
  "NOT_FOUND",
  "RATE_LIMITED",
  "REQUEST_FAILED",
  "SMART_FOLDER",
  "TAG_EXISTS",
  "TAG_OPERATION_RUNNING",
  "UNAUTHORIZED",
] as const;

export type RaycastApiErrorCode = (typeof KNOWN_ERROR_CODES)[number];

const isKnownErrorCode = (
  value: string | undefined,
): value is RaycastApiErrorCode =>
  Boolean(value) && KNOWN_ERROR_CODES.includes(value as RaycastApiErrorCode);

const getErrorMessage = (code: RaycastApiErrorCode): string => {
  switch (code) {
    case "MISSING_API_KEY":
      return "Set your Teak API key in extension preferences to continue.";
    case "INVALID_API_KEY":
    case "UNAUTHORIZED":
      return "Your Teak API key is invalid or revoked. Generate a new key in Teak Settings > Manage API Keys.";
    case "RATE_LIMITED":
      return "Too many requests right now. Please wait a moment and try again.";
    case "NETWORK_ERROR":
      return "Unable to reach Teak. Check your internet connection and try again.";
    case "CONFIG_ERROR":
      return "Teak API is missing required configuration.";
    case "DEV_API_UNAVAILABLE":
      return "Local Teak API is not running.";
    case "NOT_FOUND":
      return "Teak could not find the requested resource.";
    case "INVALID_INPUT":
    case "BAD_REQUEST":
      return "The request could not be processed. Please check your input and try again.";
    case "FOLDER_EXISTS":
      return "A folder with this name already exists. Pick another name.";
    case "FOLDER_LIMIT":
      return "That card is already in the most folders a card can be in.";
    case "SMART_FOLDER":
      return "Smart folders show the cards their search finds. Cards can't be added to one.";
    case "TAG_EXISTS":
      return "A tag with that name already exists. Merge into it instead.";
    case "TAG_OPERATION_RUNNING":
      return "Another tag change is still running. Try again in a moment.";
    case "METHOD_NOT_ALLOWED":
      return "This command is temporarily unavailable. Please update the extension and retry.";
    case "INTERNAL_ERROR":
    case "REQUEST_FAILED":
      return "Teak is temporarily unavailable. Please try again shortly.";
    default:
      return "Request failed. Please try again.";
  }
};

export const toErrorCode = (
  payloadCode: string | undefined,
  fallback: RaycastApiErrorCode,
): RaycastApiErrorCode =>
  isKnownErrorCode(payloadCode) ? payloadCode : fallback;

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
    case "CONFIG_ERROR":
      return "For local development, run bun run dev convex or set TEAK_DEV_API_URL to your Convex .site URL.";
    case "DEV_API_UNAVAILABLE":
      return "Run bun run dev convex from the Teak repo, or set TEAK_DEV_API_URL to a running Convex .site URL.";
    case "NOT_FOUND":
      return "Check your API key, API URL, and network connection, then retry.";
    default:
      return null;
  }
};
