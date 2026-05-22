export type SpConnectionIssue = "unreachable" | "not-ready";

export class SpApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(
    message: string,
    options: { code: string; status: number; details?: unknown },
  ) {
    super(message);
    this.name = "SpApiError";
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
  }
}

export class SpConnectionError extends Error {
  readonly issue: SpConnectionIssue;

  constructor(issue: SpConnectionIssue, message: string) {
    super(message);
    this.name = "SpConnectionError";
    this.issue = issue;
  }
}

export const isSpConnectionError = (
  error: unknown,
): error is SpConnectionError => error instanceof SpConnectionError;

export const isSpApiError = (error: unknown): error is SpApiError =>
  error instanceof SpApiError;

export const getSetupTitle = (error: unknown): string =>
  isSpConnectionError(error) && error.issue === "not-ready"
    ? "Super Productivity Is Starting"
    : "Super Productivity Is Unreachable";

export const getSetupDescription = (error: unknown): string =>
  isSpConnectionError(error) && error.issue === "not-ready"
    ? "The app is running but its renderer is not ready yet. Wait a moment, then refresh."
    : "Make sure the desktop app is running, then enable Settings -> Misc -> Local REST API.";

export const getSetupMarkdown = (error: unknown): string => {
  if (isSpConnectionError(error) && error.issue === "not-ready") {
    return [
      "# Super Productivity is starting",
      "",
      "The desktop app responded, but the renderer is not ready yet.",
      "",
      "Wait until the app finishes loading, then refresh this command.",
    ].join("\n");
  }

  return [
    "# Super Productivity is unreachable",
    "",
    "This extension talks to the desktop app over `http://127.0.0.1:3876`.",
    "",
    "To fix this:",
    "",
    "1. Start the Super Productivity desktop app.",
    "2. Open `Settings -> Misc`.",
    "3. Enable `Local REST API`.",
  ].join("\n");
};

export const getErrorMessage = (error: unknown): string => {
  if (isSpApiError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
};
