import { GhqCancelledError, GhqError, stripAnsi, type GetResult } from "./get";

/** Text of the toast that reports how a `ghq get` run ended. */
export type GetFeedback = {
  title: string;
  message: string;
  /** Full stderr without ANSI escape sequences, only set when ghq itself failed. */
  logs?: string;
};

const RESULT_TITLES: Record<GetResult["status"], string> = {
  cloned: "Cloned",
  exists: "Already cloned",
  unknown: "Repository ready",
};

/** Describes a successful `ghq get`: the first repository it produced, or the input when the lookup found none. */
export function describeGetResult(result: GetResult, repository: string): GetFeedback {
  return {
    title: RESULT_TITLES[result.status],
    message: result.repositories[0]?.relativePath ?? repository,
  };
}

/** Describes a `ghq get` that was cancelled, that ghq reported as failed, or that could not be run at all. */
export function describeGetError(error: unknown, repository: string): GetFeedback {
  if (error instanceof GhqCancelledError) {
    return { title: "Cancelled", message: repository };
  }
  if (error instanceof GhqError) {
    // The message is already a one-line summary; the full output is only offered through Copy Logs.
    return { title: "Failed to get repository", message: error.message, logs: stripAnsi(error.stderr) };
  }
  return { title: "Failed to run ghq", message: error instanceof Error ? error.message : String(error) };
}
