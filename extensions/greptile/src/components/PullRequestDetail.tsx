import { Detail } from "@raycast/api";

import {
  formatDate,
  formatPullRequestNumber,
  formatRepository,
  getPullRequestUrl,
} from "../helpers/format";
import { MergeRequest } from "../types";

export function PullRequestDetail({
  pullRequest,
}: {
  pullRequest: MergeRequest;
}) {
  const repository = formatRepository(pullRequest.repository);
  const url = getPullRequestUrl(
    pullRequest.repository,
    pullRequest.number,
    pullRequest.sourceRepoUrl,
  );
  const stats = pullRequest.stats;
  const createdAt = formatDate(pullRequest.createdAt)?.toLocaleString();

  const markdown = [
    `# ${pullRequest.title}`,
    "",
    `**Repository:** ${repository}`,
    `**Pull Request:** ${formatPullRequestNumber(pullRequest.number)}`,
    pullRequest.state ? `**State:** ${pullRequest.state}` : undefined,
    pullRequest.isDraft !== undefined
      ? `**Draft:** ${pullRequest.isDraft ? "Yes" : "No"}`
      : undefined,
    pullRequest.authorLogin
      ? `**Author:** ${pullRequest.authorLogin}`
      : undefined,
    createdAt ? `**Created:** ${createdAt}` : undefined,
    pullRequest.branches?.source || pullRequest.branches?.target
      ? `**Branches:** ${pullRequest.branches?.source || "unknown"} -> ${pullRequest.branches?.target || "unknown"}`
      : undefined,
    stats
      ? `**Stats:** ${stats.changedFiles ?? 0} files, +${stats.additions ?? 0}/-${stats.deletions ?? 0}`
      : undefined,
    `**Comments:** ${pullRequest.commentsCount ?? 0}`,
    `**Reviews:** ${pullRequest.reviewsCount ?? 0}`,
    url ? `\n[Open Pull Request](${url})` : undefined,
  ]
    .filter(Boolean)
    .join("\n");

  return <Detail markdown={markdown} />;
}
