import { PullRequest } from "../github/types";
import { canApprove } from "./canApprove";
import { primaryMergeAction } from "./primaryMergeAction";

export type MenuBarAction = "approve" | "merge" | "enable-auto-merge" | "open";

export type MenuBarSection = "review" | "mine";

/** The highlighted action for a PR row, by section and approvability. */
export function menuBarPrimaryAction(
  pr: PullRequest,
  section: MenuBarSection,
  viewerLogin: string | undefined,
): MenuBarAction {
  if (section === "review") {
    return canApprove(pr, viewerLogin) ? "approve" : "open";
  }
  const merge = primaryMergeAction(pr);
  if (merge === "merge") return "merge";
  if (merge === "enable-auto-merge") return "enable-auto-merge";
  return "open";
}
