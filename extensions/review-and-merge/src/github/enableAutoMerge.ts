import { open, showToast, Toast } from "@raycast/api";
import { ENABLE_AUTO_MERGE } from "./queries";
import { PullRequest } from "./types";
import { runMutation } from "./runMutation";

/**
 * Enable auto-merge for a pull request.
 *
 * Repositories must opt into auto-merge in their settings. When the repo has
 * it disabled the GitHub API rejects the mutation with a cryptic message, so
 * we check up front and show an actionable explanation instead of failing.
 */
export async function enableAutoMerge(pr: PullRequest, onRefresh: () => void) {
  if (!pr.autoMergeAllowed) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Auto-merge is off for this repository",
      message: `Turn on “Allow auto-merge” in ${pr.repo}'s settings (Settings → General).`,
      primaryAction: {
        title: "Open Repository Settings",
        onAction: () => open(`https://github.com/${pr.repo}/settings`),
      },
    });
    return;
  }

  await runMutation(
    "Enabling auto-merge…",
    `Auto-merge enabled on ${pr.repo}#${pr.number}`,
    ENABLE_AUTO_MERGE,
    { prId: pr.id, method: pr.defaultMergeMethod },
    onRefresh,
  );
}
