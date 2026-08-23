import { GithubCheckConclusionState, GithubCheckStatusState, GithubPullRequestReviewState } from "./types";

/** Emoji for a GitHub check run based on its conclusion / status. */
export function checkRunEmoji(conclusion?: GithubCheckConclusionState, status?: GithubCheckStatusState): string {
  if (status && status !== GithubCheckStatusState.Completed) {
    return "⏳";
  }
  switch (conclusion) {
    case GithubCheckConclusionState.Success:
      return "✅";
    case GithubCheckConclusionState.Failure:
    case GithubCheckConclusionState.StartupFailure:
    case GithubCheckConclusionState.TimedOut:
      return "❌";
    case GithubCheckConclusionState.ActionRequired:
      return "⚠️";
    case GithubCheckConclusionState.Cancelled:
    case GithubCheckConclusionState.Skipped:
    case GithubCheckConclusionState.Stale:
      return "⚪";
    case GithubCheckConclusionState.Neutral:
      return "➖";
    default:
      return "🟡";
  }
}

/** Emoji for a GitHub pull request review state. */
export function reviewStateEmoji(state: GithubPullRequestReviewState): string {
  switch (state) {
    case GithubPullRequestReviewState.Approved:
      return "✅";
    case GithubPullRequestReviewState.ChangesRequested:
      return "🔴";
    case GithubPullRequestReviewState.Commented:
      return "💬";
    case GithubPullRequestReviewState.Dismissed:
      return "🚫";
    case GithubPullRequestReviewState.Pending:
      return "⏳";
  }
}
