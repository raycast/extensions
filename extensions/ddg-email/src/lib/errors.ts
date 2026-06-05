import { Toast } from "@raycast/api";

export class DdgApiError extends Error {
  status?: number;

  title: string;

  constructor(title: string, message: string, status?: number) {
    super(message);
    this.name = "DdgApiError";
    this.title = title;
    this.status = status;
  }
}

export function isDdgApiError(error: unknown): error is DdgApiError {
  return error instanceof DdgApiError;
}

export function getToastOptions(
  error: unknown,
  onClearSession?: () => Promise<void>,
): Toast.Options {
  if (isDdgApiError(error)) {
    return {
      style: Toast.Style.Failure,
      title: error.title,
      message: error.message,
      primaryAction: onClearSession
        ? {
            title: "Clear Stored Session",
            onAction: onClearSession,
          }
        : undefined,
    };
  }

  return {
    style: Toast.Style.Failure,
    title: "Unexpected Error",
    message: error instanceof Error ? error.message : "Something went wrong.",
  };
}
