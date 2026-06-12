import { showToast, Toast } from "@raycast/api";
import { githubGraphql } from "./client";

/** Turn known cryptic GitHub API errors into actionable messages. */
function humanizeError(message: string): string {
  if (/auto.?merge is not allowed/i.test(message)) {
    return "Auto-merge isn't enabled for this repository. Turn on “Allow auto-merge” in the repo settings (Settings → General).";
  }
  return message;
}

export async function runMutation(
  title: string,
  successTitle: string,
  mutation: string,
  variables: Record<string, unknown>,
  onRefresh: () => void,
) {
  const toast = await showToast({ style: Toast.Style.Animated, title });
  try {
    await githubGraphql(mutation, variables);
    toast.style = Toast.Style.Success;
    toast.title = successTitle;
    onRefresh();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "GitHub rejected the operation";
    toast.message = humanizeError(
      error instanceof Error ? error.message : String(error),
    );
  }
}
