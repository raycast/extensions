import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Toast,
  showToast,
} from "@raycast/api";
import { useEffect } from "react";

import { useCodeReview } from "../hooks/useGreptile";
import { getErrorMessage } from "../helpers/errors";
import {
  formatDate,
  formatPullRequestNumber,
  formatRepository,
  getPullRequestUrl,
} from "../helpers/format";
import { CodeReview } from "../types";

export function CodeReviewDetail({ review }: { review: CodeReview }) {
  const { codeReview, error, isLoading, mutate } = useCodeReview(review.id);
  const detail = codeReview || review;

  useEffect(() => {
    if (!error) {
      return;
    }

    void showToast({
      style: Toast.Style.Failure,
      title: "Could not load latest review details",
      message: getErrorMessage(error),
    });
  }, [error]);

  const repository = formatRepository(detail.mergeRequest?.repository);
  const prNumber = detail.mergeRequest?.prNumber || detail.mergeRequest?.number;
  const prUrl = getPullRequestUrl(
    detail.mergeRequest?.repository,
    prNumber,
    detail.mergeRequest?.sourceRepoUrl,
  );
  const createdAt = formatDate(detail.createdAt)?.toLocaleString();
  const completedAt = formatDate(detail.completedAt)?.toLocaleString();

  const metadata = [
    `# Greptile Code Review`,
    "",
    detail.mergeRequest?.title
      ? `**Pull Request:** ${detail.mergeRequest.title}`
      : undefined,
    `**Repository:** ${repository}`,
    `**PR Number:** ${formatPullRequestNumber(prNumber)}`,
    `**Status:** ${detail.status}`,
    detail.mergeRequest?.authorLogin
      ? `**Author:** ${detail.mergeRequest.authorLogin}`
      : undefined,
    createdAt ? `**Created:** ${createdAt}` : undefined,
    completedAt ? `**Completed:** ${completedAt}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");

  const markdown = detail.body
    ? `${metadata}\n\n---\n\n${detail.body}`
    : metadata;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {prUrl ? (
            <Action.OpenInBrowser
              title="Open Pull Request"
              icon={Icon.Globe}
              url={prUrl}
            />
          ) : null}
          <Action
            title="Refresh Details"
            icon={Icon.ArrowClockwise}
            onAction={() => void mutate()}
          />
          <Action.CopyToClipboard title="Copy Review ID" content={detail.id} />
        </ActionPanel>
      }
    />
  );
}
