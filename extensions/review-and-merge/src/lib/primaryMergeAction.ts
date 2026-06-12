import { PullRequest } from "../github/types";
import { mergeReadiness } from "./mergeReadiness";

export type PrimaryMerge = "merge" | "enable-auto-merge" | "none";

export function primaryMergeAction(pr: PullRequest): PrimaryMerge {
  if (pr.state !== "OPEN" || pr.isDraft) {
    return "none";
  }
  const readiness = mergeReadiness(pr.mergeStateStatus);
  if (readiness.kind === "ready") {
    return "merge";
  }
  if (pr.autoMergeEnabled) {
    return "none";
  }
  // Not mergeable and auto-merge can't fix it (conflicts / unknown): the row
  // falls back to Open in browser as its primary action.
  if (readiness.kind === "blocked" && !readiness.autoMergeable) {
    return "none";
  }
  return "enable-auto-merge";
}
