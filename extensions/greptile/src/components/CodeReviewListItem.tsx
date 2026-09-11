import { Action, ActionPanel, Icon, List } from "@raycast/api";

import {
  codeReviewStatusAccessory,
  formatDate,
  formatPullRequestNumber,
  formatRepository,
  getPullRequestUrl,
} from "../helpers/format";
import { CodeReview } from "../types";
import { CodeReviewDetail } from "./CodeReviewDetail";

export function CodeReviewListItem({ review }: { review: CodeReview }) {
  const repository = formatRepository(review.mergeRequest?.repository);
  const prNumber = review.mergeRequest?.prNumber || review.mergeRequest?.number;
  const prLabel = formatPullRequestNumber(prNumber);
  const title = review.mergeRequest?.title || review.id;
  const prUrl = getPullRequestUrl(
    review.mergeRequest?.repository,
    prNumber,
    review.mergeRequest?.sourceRepoUrl,
  );

  const accessories: List.Item.Accessory[] = [
    codeReviewStatusAccessory(review.status),
    { date: formatDate(review.createdAt), tooltip: "Created" },
    { date: formatDate(review.completedAt), tooltip: "Completed" },
  ];

  return (
    <List.Item
      title={title}
      subtitle={`${repository} ${prLabel}`}
      icon={
        review.status === "COMPLETED" ? Icon.CheckCircle : Icon.CircleProgress
      }
      keywords={[repository, prLabel, review.status, review.id]}
      accessories={accessories}
      actions={
        <ActionPanel title={title}>
          <Action.Push
            title="Show Details"
            icon={Icon.Sidebar}
            target={<CodeReviewDetail review={review} />}
          />
          {prUrl ? (
            <Action.OpenInBrowser
              title="Open Pull Request"
              icon={Icon.Globe}
              url={prUrl}
            />
          ) : null}
          <Action.CopyToClipboard title="Copy Review ID" content={review.id} />
        </ActionPanel>
      }
    />
  );
}
