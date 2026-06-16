import { PullRequest } from "../github/types";
import { primaryMergeAction } from "./primaryMergeAction";

export interface MenuBarTitle {
  /** Badge text next to the icon; omitted (icon only) when there is nothing to review. */
  title?: string;
  tooltip: string;
}

/**
 * Badge + tooltip for the menu-bar icon. The badge counts PRs awaiting your
 * review; the tooltip adds how many of your own PRs are mergeable right now.
 */
export function menuBarTitle(
  toReview: PullRequest[],
  mine: PullRequest[],
): MenuBarTitle {
  const reviewCount = toReview.length;
  const readyCount = mine.filter(
    (pr) => primaryMergeAction(pr) === "merge",
  ).length;
  return {
    title: reviewCount > 0 ? `● ${reviewCount}` : undefined,
    tooltip: `${reviewCount} to review · ${readyCount} of mine ready to merge`,
  };
}
