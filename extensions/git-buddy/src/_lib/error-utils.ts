import { Toast, popToRoot, showToast } from "@raycast/api";
import { ERROR_MESSAGES } from "../_constants";

export async function handleError(errorMessage: string) {
  await popToRoot();
  await showToast({
    style: Toast.Style.Failure,
    title: "Error",
    message: errorMessage,
  });
}

export function handleGitError(error: Error): Error {
  const errorMessage = error.message.toLowerCase();

  if (errorMessage.includes("would be overwritten by checkout")) {
    return new Error(ERROR_MESSAGES.CHECKOUT_BRANCH);
  }

  if (errorMessage.includes("not a git repository")) {
    return new Error(ERROR_MESSAGES.INVALID_REPO);
  }

  if (errorMessage.includes("already exists")) {
    return new Error(ERROR_MESSAGES.BRANCH_EXISTS);
  }

  // If no specific error is matched, return the original error
  return error;
}

export function handleFetchAIContentError(error: Error, diffType: "staged" | "baseBranch"): never {
  const errorMessage = error.message;
  const knownErrors = {
    [ERROR_MESSAGES.GIT_DIFF_EMPTY]: ERROR_MESSAGES.GIT_DIFF_EMPTY,
    [ERROR_MESSAGES.REPO_PATH_MISSING]: ERROR_MESSAGES.REPO_PATH_MISSING,
    [ERROR_MESSAGES.INVALID_REPO]: ERROR_MESSAGES.INVALID_REPO,
    "No AI model provided": ERROR_MESSAGES.AI_MODEL_MISSING,
    "Invalid AI model": ERROR_MESSAGES.AI_MODEL_INVALID,
  };

  const knownError = Object.entries(knownErrors).find(([key]) => errorMessage.includes(key));
  if (knownError) {
    throw new Error(knownError[1]);
  }

  throw new Error(diffType === "staged" ? ERROR_MESSAGES.FETCH_COMMIT_MESSAGE : ERROR_MESSAGES.FETCH_PR_DESCRIPTION);
}
