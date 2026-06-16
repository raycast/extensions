import { Alert, confirmAlert } from "@raycast/api";
import { MERGE_PULL_REQUEST } from "./queries";
import { PullRequest } from "./types";
import { runMutation } from "./runMutation";
import { mergeReadiness } from "../lib/mergeReadiness";

/**
 * Merge a PR with the repo's default method. When the merge is "risky"
 * (UNSTABLE — non-required checks failing) it asks for confirmation first.
 */
export async function confirmAndMerge(pr: PullRequest, onRefresh: () => void) {
  const readiness = mergeReadiness(pr.mergeStateStatus);
  if (readiness.kind === "confirm") {
    const confirmed = await confirmAlert({
      title: "Merge anyway?",
      message: readiness.reason,
      primaryAction: { title: "Merge", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
  }
  await runMutation(
    "Merging…",
    `Merged ${pr.repo}#${pr.number}`,
    MERGE_PULL_REQUEST,
    { prId: pr.id, method: pr.defaultMergeMethod },
    onRefresh,
  );
}
