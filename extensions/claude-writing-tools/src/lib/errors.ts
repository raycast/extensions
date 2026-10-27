import Anthropic from "@anthropic-ai/sdk";
import { openExtensionPreferences, showHUD, showToast, Toast } from "@raycast/api";
import { IncompleteResponseError, RefusalError } from "./claude";

/** Nothing is selected and the clipboard fallback found nothing either. */
export class NoInputError extends Error {
  constructor() {
    super("No input");
    this.name = "NoInputError";
  }
}

export interface ErrorInfo {
  title: string;
  message?: string;
  /** The fix is in the extension preferences (missing or wrong API key, model access). */
  preferences?: boolean;
  /** The user cancelled; nothing to report. */
  silent?: boolean;
}

const REFUSAL_CATEGORIES: Record<string, string> = {
  cyber: "cybersecurity",
  bio: "biology",
  frontier_llm: "AI model development",
  reasoning_extraction: "reasoning extraction",
  general_harms: "general safety",
};

export function describeError(error: unknown): ErrorInfo {
  if (error instanceof Anthropic.APIUserAbortError) return { title: "Stopped", silent: true };
  if (error instanceof NoInputError) {
    return { title: "No text selected", message: "Select some text first, or copy it to the clipboard." };
  }
  if (error instanceof RefusalError) {
    const category = error.category ? (REFUSAL_CATEGORIES[error.category] ?? error.category) : undefined;
    return {
      title: "Claude declined this request",
      message: category ? `A safety classifier stepped in (${category}).` : "Try phrasing the request differently.",
    };
  }
  if (error instanceof IncompleteResponseError) {
    return { title: "The reply was cut off", message: "The text may be too long; try a shorter piece." };
  }
  if (error instanceof Anthropic.AuthenticationError) {
    return { title: "Invalid API key", message: "Check your key in the extension preferences.", preferences: true };
  }
  if (error instanceof Anthropic.PermissionDeniedError) {
    return { title: "Access denied", message: error.message, preferences: true };
  }
  if (error instanceof Anthropic.NotFoundError) {
    return {
      title: "Model not found",
      message: "Your account may not have access to this model; pick another one in the preferences.",
      preferences: true,
    };
  }
  if (error instanceof Anthropic.RateLimitError) {
    return { title: "Rate limit reached", message: "Wait a few seconds and try again." };
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return { title: "Can't reach Anthropic", message: "Check your internet connection." };
  }
  if (error instanceof Anthropic.APIError) {
    if (error.type === "billing_error" || error.status === 402) {
      return { title: "Out of credits", message: "Check your balance in the Claude Console." };
    }
    if (error.type === "overloaded_error" || error.status === 529) {
      return { title: "Claude is overloaded", message: "Try again in a moment or pick another model." };
    }
    if (error instanceof Anthropic.InternalServerError) {
      return { title: "Anthropic server error", message: "Try again in a moment." };
    }
    return { title: `Request failed (${error.status ?? "?"})`, message: error.message };
  }
  return { title: "Something went wrong", message: error instanceof Error ? error.message : String(error) };
}

/** Failure toast with a shortcut to the preferences when the API key is the problem. */
export async function showError(error: unknown): Promise<void> {
  const info = describeError(error);
  if (info.silent) return;
  console.error(error);
  await showToast({
    style: Toast.Style.Failure,
    title: info.title,
    message: info.message,
    primaryAction: info.preferences
      ? { title: "Open Preferences", onAction: () => openExtensionPreferences() }
      : undefined,
  });
}

/** For no-view commands whose window is already closed. */
export async function showErrorHUD(error: unknown): Promise<void> {
  const info = describeError(error);
  if (info.silent) return;
  console.error(error);
  await showHUD(`⚠️ ${info.title}${info.message ? ` — ${info.message}` : ""}`);
}
