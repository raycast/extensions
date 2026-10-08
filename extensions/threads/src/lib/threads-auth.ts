/**
 * Raycast-side glue for the Threads API client: reads the access token preference
 * and turns API failures into House Style toasts. Anything that imports
 * `@raycast/api` belongs here rather than in `threads-api.ts`.
 */
import { Toast, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { getErrorMessage, showError } from "@chrismessina/raycast-kit";
import { logger } from "@chrismessina/raycast-logger";
import { MissingPermissionError, RateLimitedError, ThreadsApiError, TokenExpiredError } from "./threads-api";

export const TOKEN_HELP_URL = "https://threads-analytics.app/en/token-guide";

const OPEN_PREFERENCES_ACTION: Toast.ActionOptions = {
  title: "Open Extension Preferences",
  onAction: () => void openExtensionPreferences(),
};

/** The token from Extension Preferences, or `undefined` when it hasn't been filled in. */
export function getAccessToken(): string | undefined {
  const { accessToken } = getPreferenceValues<Preferences>();
  const trimmed = accessToken?.trim();
  return trimmed ? trimmed : undefined;
}

export const MISSING_TOKEN_TITLE = "Threads Access Token Missing";
export const MISSING_TOKEN_MESSAGE = "Paste a long-lived Threads access token into the extension preferences.";

const TOKEN_EXPIRED_TITLE = "Threads Access Token Expired";
const TOKEN_EXPIRED_MESSAGE =
  "Generate a new token on developers.facebook.com and paste it into the extension preferences.";

const RATE_LIMITED_TITLE = "Threads Rate Limit Reached";
const RATE_LIMITED_MESSAGE = "The Threads API is throttling this token. Try again in a little while.";

const MISSING_PERMISSION_TITLE = "Access Token Missing a Permission";

export function isTokenExpired(error: unknown): boolean {
  return error instanceof TokenExpiredError;
}

export interface ApiErrorDescription {
  title: string;
  message: string;
  /** The fix is a new token, so the preferences are where to send the user. */
  fixInPreferences: boolean;
}

/** Title and message for an error, matching what the toast would say. */
export function describeApiError(error: unknown, fallbackTitle: string): ApiErrorDescription {
  if (error instanceof TokenExpiredError) {
    return { title: TOKEN_EXPIRED_TITLE, message: TOKEN_EXPIRED_MESSAGE, fixInPreferences: true };
  }
  // Nothing in the preferences helps here; the only fix is to wait and retry.
  if (error instanceof RateLimitedError) {
    return { title: RATE_LIMITED_TITLE, message: RATE_LIMITED_MESSAGE, fixInPreferences: false };
  }
  if (error instanceof MissingPermissionError) {
    return {
      title: MISSING_PERMISSION_TITLE,
      message: error.scope
        ? `Generate a new token with the ${error.scope} permission and paste it into the extension preferences.`
        : "Generate a new token with every listed permission and paste it into the extension preferences.",
      fixInPreferences: true,
    };
  }
  return { title: fallbackTitle, message: getErrorMessage(error), fixInPreferences: false };
}

/**
 * Reports an API failure. The failures with a known fix — a lapsed token, a rate
 * limit, a missing scope — get their own wording, and the two fixed with a new token
 * also get an action that opens the preferences.
 */
export async function showApiError(error: unknown, options: { title: string; copyContext?: string }): Promise<void> {
  const copyContext =
    error instanceof ThreadsApiError
      ? [options.copyContext, `GET ${error.path} → ${error.status}${error.code ? ` (code ${error.code})` : ""}`]
          .filter(Boolean)
          .join("\n")
      : error instanceof MissingPermissionError
        ? [options.copyContext, `GET ${error.path} → missing ${error.scope ?? "permission"}`].filter(Boolean).join("\n")
        : options.copyContext;

  logger.error(`[threads-auth] ${options.title}`, { error: getErrorMessage(error), copyContext });

  const described = describeApiError(error, options.title);
  const classified = described.title !== options.title;

  await showError(error, {
    title: described.title,
    // Keep the API's own words for an unclassified failure; replace them only when
    // there is a concrete instruction to give instead.
    message: classified ? described.message : undefined,
    action: described.fixInPreferences ? OPEN_PREFERENCES_ACTION : undefined,
    copyContext,
    // The 20s request timeout surfaces as an abort, which showError otherwise swallows.
    ignoreAbort: false,
  });
}
