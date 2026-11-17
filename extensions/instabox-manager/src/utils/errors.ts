import { openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { InstaBoxError } from "../services/instabox";

const AUTH_CODES = new Set(["unauthenticated", "api_key_expired", "api_key_revoked"]);

export function describeError(error: unknown): { title: string; message?: string; isAuth: boolean } {
  if (error instanceof InstaBoxError) {
    const message = error.message;
    if (AUTH_CODES.has(error.code) || error.status === 401) {
      return { title: "Invalid InstaBox API key", message, isAuth: true };
    }
    switch (error.code) {
      case "insufficient_scope":
        return { title: "API key is missing a scope", message, isAuth: true };
      case "permission_denied":
        return { title: "Permission denied", message, isAuth: false };
      case "invite_required":
        return { title: "InstaBox account is not activated", message, isAuth: false };
      case "operation_conflict":
        return { title: "Another operation is in progress", message, isAuth: false };
      case "machine_not_running":
        return { title: "Machine is not running", message, isAuth: false };
      case "quota_exceeded":
        return { title: "InstaBox limit reached", message, isAuth: false };
      case "template_not_allowed":
        return { title: "Template is not on your plan", message, isAuth: false };
      case "credit_exhausted":
        return { title: "Free hours used up for this month", message, isAuth: false };
      case "spend_limit_reached":
        return { title: "Spend limit reached for this month", message, isAuth: false };
      case "subscription_required":
        return { title: "InstaBox subscription ended", message, isAuth: false };
      case "payment_method_required":
        return { title: "Payment method required", message, isAuth: false };
      case "rate_limited":
      case "concurrency_limit":
        return { title: "Too many requests, try again shortly", message, isAuth: false };
      case "no_capacity":
      case "host_unavailable":
        return { title: "InstaBox is busy, try again shortly", message, isAuth: false };
      case "not_found":
        return { title: "Not found", message, isAuth: false };
      default:
        return { title: "InstaBox request failed", message, isAuth: false };
    }
  }
  if (error instanceof TypeError && error.message === "fetch failed") {
    return { title: "Could not reach InstaBox", message: "Check your connection and the API URL", isAuth: false };
  }
  return {
    title: "Something went wrong",
    message: error instanceof Error ? error.message : String(error),
    isAuth: false,
  };
}

/** Shows an API error as a failure toast, updating `toast` when given. */
export async function showError(error: unknown, options: { title?: string; toast?: Toast } = {}) {
  const described = describeError(error);
  const primaryAction = described.isAuth
    ? { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() }
    : undefined;
  const title = options.title ?? described.title;
  const message = options.title ? `${described.title}: ${described.message ?? ""}`.trim() : described.message;

  if (options.toast) {
    options.toast.style = Toast.Style.Failure;
    options.toast.title = title;
    options.toast.message = message;
    options.toast.primaryAction = primaryAction;
    return options.toast;
  }
  return showToast({ style: Toast.Style.Failure, title, message, primaryAction });
}

/** An `onError` handler for the data hooks that shows a failure toast titled `title`. */
export function errorToast(title: string) {
  return (error: Error) => {
    showError(error, { title });
  };
}
