import { PullRequest, PullRequestNode } from "../github/types";

export function mapPullRequest(
  node: PullRequestNode,
  viewerLogin: string,
): PullRequest {
  return {
    id: node.id,
    number: node.number,
    title: node.title,
    url: node.url,
    state: node.state,
    isDraft: node.isDraft,
    updatedAt: node.updatedAt,
    headRefName: node.headRefName,
    authorLogin: node.author?.login ?? "ghost",
    authorAvatarUrl: node.author?.avatarUrl ?? "",
    repo: node.repository.nameWithOwner,
    defaultMergeMethod: node.repository.viewerDefaultMergeMethod,
    reviewDecision: node.reviewDecision,
    mergeStateStatus: node.mergeStateStatus,
    checksState: node.commits.nodes[0]?.commit.statusCheckRollup?.state ?? null,
    autoMergeEnabled: node.autoMergeRequest !== null,
    autoMergeAllowed: node.repository.autoMergeAllowed,
    viewerHasApproved: node.latestReviews.nodes.some(
      (review) =>
        review.author?.login === viewerLogin && review.state === "APPROVED",
    ),
    comments: node.comments.totalCount,
  };
}
