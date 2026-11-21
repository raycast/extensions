import { openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { SaveeError } from "./api";
import { MissingTokenError, usesPersonalAccessToken } from "./auth";
import { formatWait } from "./rate-limit";

type ErrorInfo = {
  title: string;
  message?: string;
  needsPreferences: boolean;
};

export function describeError(error: unknown): ErrorInfo {
  if (error instanceof MissingTokenError) {
    return {
      title: "Add your Savee token",
      message: "Generate one in Savee → Settings → Developers",
      needsPreferences: true,
    };
  }

  if (error instanceof SaveeError) {
    switch (error.code) {
      case "UNAUTHORIZED":
        return {
          title: "Savee didn't accept your token",
          message: usesPersonalAccessToken() ? "Check your personal access token" : "Sign in again",
          needsPreferences: usesPersonalAccessToken(),
        };
      case "PAYMENT_REQUIRED":
        return {
          title: "Savee subscription needed",
          message: "The Savee API needs an active plan",
          needsPreferences: false,
        };
      case "FORBIDDEN":
        return { title: "Savee API not available", message: error.message, needsPreferences: false };
      case "NOT_FOUND":
        return { title: "Not found on Savee", message: error.message, needsPreferences: false };
      case "TOO_MANY_REQUESTS":
        return {
          title: "Savee rate limit reached",
          message: "Try again " + formatWait(error.retryAfter),
          needsPreferences: false,
        };
      default:
        return { title: "Savee request failed", message: error.message, needsPreferences: false };
    }
  }

  return {
    title: "Something went wrong",
    message: error instanceof Error ? error.message : String(error),
    needsPreferences: false,
  };
}

export async function showSaveeError(error: unknown): Promise<void> {
  const { title, message, needsPreferences } = describeError(error);
  await showToast({
    style: Toast.Style.Failure,
    title,
    message,
    primaryAction: needsPreferences
      ? { title: "Open Preferences", onAction: () => openExtensionPreferences() }
      : undefined,
  });
}

/** For AI tools: a plain sentence the model can relay. */
export function getErrorMessage(error: unknown): string {
  const { title, message } = describeError(error);
  return message ? title + ". " + message + "." : title + ".";
}
