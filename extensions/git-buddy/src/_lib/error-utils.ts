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
