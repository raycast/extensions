import { ApiError } from "./api";

export interface ErrorDescription {
  title: string;
  message?: string;
  needsPreferences: boolean;
}

/** Turns a failed search into a title, an optional hint and whether the preferences can fix it. */
export function describeError(error: Error): ErrorDescription {
  if (!(error instanceof ApiError)) {
    return {
      title: "Can't reach easyVerein",
      message: "Pages and settings are still available.",
      needsPreferences: true,
    };
  }
  if (error.status === 401) {
    return { title: "Invalid API key", needsPreferences: true };
  }
  if (error.status === 403) {
    return { title: "Search is only available to board members", needsPreferences: true };
  }
  if (error.status === 429) {
    return { title: "Too many requests, please wait a moment", needsPreferences: false };
  }
  return { title: `Search failed (${error.status})`, needsPreferences: false };
}

/** Groups errors for the toast: one per HTTP status, one for network failures. */
export function errorKind(error: Error): string {
  return error instanceof ApiError ? String(error.status) : "network";
}
