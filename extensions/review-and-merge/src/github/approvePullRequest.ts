import { showToast, Toast } from "@raycast/api";
import { githubGraphql } from "./client";
import { APPROVE_PULL_REQUEST } from "./queries";
import { PullRequest } from "./types";

/** Submit an APPROVE review for a PR, with progress/success/failure toasts. */
export async function approvePullRequest(
  pr: PullRequest,
  onRefresh: () => void,
) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Approving…",
  });
  try {
    await githubGraphql(APPROVE_PULL_REQUEST, { prId: pr.id });
    toast.style = Toast.Style.Success;
    toast.title = `Approved ${pr.repo}#${pr.number}`;
    onRefresh();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Approve failed";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
