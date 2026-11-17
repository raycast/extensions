import { Color, Icon } from "@raycast/api";
import { PullRequestStatus } from "./github";
import { humanize, pluralize } from "./presentation";

/** One fact about a PR, ready for a tag, an accessory icon, or a metadata row. */
export type Indicator = { label: string; color: Color; icon: Icon; tooltip?: string };

export function isReadyToMerge(mergeability: string | undefined): boolean {
  return Boolean(mergeability?.startsWith("READY_TO_MERGE"));
}

export function checksIndicator(checks: string | null): Indicator | undefined {
  switch (checks) {
    case "SUCCESS":
      return { label: "Checks passed", color: Color.Green, icon: Icon.CheckCircle };
    case "FAILURE":
    case "ERROR":
      return { label: "Checks failing", color: Color.Red, icon: Icon.XMarkCircle };
    case "PENDING":
    case "EXPECTED":
      return { label: "Checks running", color: Color.Yellow, icon: Icon.Clock };
    default:
      return undefined;
  }
}

export function conversationsIndicator(status: PullRequestStatus): Indicator | undefined {
  if (status.unresolvedThreads > 0) {
    return {
      label: status.threadsTruncated
        ? `${status.unresolvedThreads}+ unresolved comments`
        : pluralize(status.unresolvedThreads, "unresolved comment"),
      color: Color.Orange,
      icon: Icon.SpeechBubbleActive,
    };
  }
  if (status.threadsTruncated) {
    return {
      label: "Too many comment threads to check",
      color: Color.SecondaryText,
      icon: Icon.SpeechBubble,
      tooltip: "Open the pull request on GitHub to see every comment thread",
    };
  }
  if (status.approvalsWithComments.length > 0) {
    const who = status.approvalsWithComments.map((review) => review.author?.login ?? "someone").join(", ");
    return {
      label: "Approved with comments",
      color: Color.Blue,
      icon: Icon.SpeechBubble,
      tooltip: `${who} approved and left comments`,
    };
  }
  return undefined;
}

export function reviewIndicator(reviewDecision: string | null | undefined): Indicator | undefined {
  switch (reviewDecision) {
    case "APPROVED":
      return { label: "Approved", color: Color.Green, icon: Icon.CheckCircle };
    case "CHANGES_REQUESTED":
      return { label: "Changes requested", color: Color.Red, icon: Icon.ExclamationMark };
    case "REVIEW_REQUIRED":
      return { label: "Review required", color: Color.SecondaryText, icon: Icon.Eye };
    default:
      return undefined;
  }
}

/** What *you* did on someone else's PR, so reviewed PRs that still need you stand out. */
export function viewerReviewIndicator(status: PullRequestStatus): Indicator | undefined {
  if (status.viewerDidAuthor) return undefined;
  switch (status.viewerReview) {
    case "APPROVED":
      return { label: "You approved", color: Color.Green, icon: Icon.Checkmark };
    case "CHANGES_REQUESTED":
      return { label: "You requested changes", color: Color.Red, icon: Icon.Undo };
    case "COMMENTED":
      return { label: "You commented", color: Color.SecondaryText, icon: Icon.SpeechBubble };
    default:
      return undefined;
  }
}

export function mergeIndicator(mergeability: string | undefined): Indicator | undefined {
  if (!mergeability) return undefined;
  if (isReadyToMerge(mergeability)) {
    return { label: "Ready to merge", color: Color.Green, icon: Icon.ArrowRightCircle };
  }
  switch (mergeability) {
    case "QUEUED_TO_MERGE":
    case "WAITING_TO_MERGE":
    case "REBASING":
    case "HANDED_OFF_TO_EXTERNAL_MERGE_QUEUE":
      return { label: "Merging", color: Color.Purple, icon: Icon.ArrowRightCircle };
    case "MERGE_CONFLICTS":
      return { label: "Merge conflicts", color: Color.Red, icon: Icon.Warning };
    case "MERGED":
    case "CLOSED":
    case "DRAFT":
      return undefined; // already shown by the PR state
    default:
      return { label: humanize(mergeability), color: Color.SecondaryText, icon: Icon.Hourglass };
  }
}
