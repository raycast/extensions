import { ErrorType } from "../types";

/**
 * One source of truth for how a failed dig is described.
 *
 * The same failure surfaces twice — as the empty state, and as the toast that
 * fires alongside it — and each used to build its own text. That drifted
 * immediately: the toast was hardcoded to "Fetch Error" while the card said
 * "Connection Failed", and the toast's Copy Error yielded one summary line where
 * the card's yielded the full report. Both now call through here, so there is no
 * second copy to fall out of step.
 */

/** Title for an error type. */
export function getErrorTitle(errorType: ErrorType | null): string {
  switch (errorType) {
    case "network":
      return "Connection Failed";
    case "blocked":
      return "Access Blocked";
    case "notFound":
      return "Page Not Found";
    case "serverError":
      return "Server Error";
    case "invalid":
      return "Invalid URL";
    default:
      return "Fetch Error";
  }
}

/** Actionable suggestions for an error type. Consumed only by buildErrorReport. */
function getErrorSuggestions(errorType: ErrorType | null): string[] {
  switch (errorType) {
    case "network":
      return [
        "Check your internet connection",
        "Verify the URL is spelled correctly",
        "The website may be temporarily down",
        "Try again in a few moments",
      ];
    case "blocked":
      return [
        "The site may have bot protection enabled",
        "You may be rate limited - wait a moment",
        "Try accessing the site in a browser first",
        "Some sites block automated requests",
      ];
    case "notFound":
      return [
        "Double-check the URL for typos",
        "The page may have been moved or deleted",
        "Try the site's homepage instead",
      ];
    case "serverError":
      return [
        "The website is experiencing issues",
        "Try again in a few minutes",
        "Check if the site is down for everyone",
      ];
    case "invalid":
      return [
        "Make sure the URL starts with http:// or https://",
        "Check for special characters in the URL",
        "Try copying the URL directly from your browser",
      ];
    default:
      return ["Try again", "Check the URL and try once more"];
  }
}

export interface ErrorReportInput {
  errorType: ErrorType | null;
  /** The classified, human-readable message. */
  message: string;
  /** The URL being dug, if known. */
  url?: string;
  /** Underlying causes. In practice this is one entry; see the note below. */
  causes?: { description: string; message: string }[];
}

/**
 * The block a user pastes into a bug report.
 *
 * A total failure yields exactly ONE cause — `addFetchError` is only ever called
 * for the "main" category — so a single cause renders as one `Cause:` line
 * rather than a plural heading over a list of one. The list form is retained for
 * the day the other FetchCategory values actually report.
 */
export function buildErrorReport({ errorType, message, url, causes = [] }: ErrorReportInput): string {
  const title = getErrorTitle(errorType);
  const suggestions = getErrorSuggestions(errorType);

  const causeBlock =
    causes.length === 1
      ? `Cause: ${causes[0].message}`
      : causes.length > 1
        ? `Failed components:\n${causes.map((c) => `- ${c.description}: ${c.message}`).join("\n")}`
        : "";

  // URL and cause form one block, so the blank line before it is decided once
  // here rather than by each part guessing whether the other exists.
  const context = [url ? `URL: ${url}` : "", causeBlock].filter(Boolean).join("\n");

  return [title, message, context && `\n${context}`, `\nSuggestions:\n${suggestions.map((s) => `- ${s}`).join("\n")}`]
    .filter(Boolean)
    .join("\n");
}
