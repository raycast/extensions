import { Action, ActionPanel, Detail, Icon } from "@raycast/api";

import {
  formatDate,
  formatPullRequestNumber,
  formatRepository,
  getCommentUrl,
} from "../helpers/format";
import { GreptileComment } from "../types";

export function CommentDetail({ comment }: { comment: GreptileComment }) {
  const repository = formatRepository(comment.mergeRequest?.repository);
  const createdAt = formatDate(comment.createdAt)?.toLocaleString();
  const commentUrl = getCommentUrl(comment);
  const lineRange =
    comment.lineStart && comment.lineEnd
      ? `${comment.lineStart}-${comment.lineEnd}`
      : comment.lineStart
        ? String(comment.lineStart)
        : undefined;

  const markdown = [
    "# Greptile Comment",
    "",
    `**Repository:** ${repository}`,
    `**Pull Request:** ${formatPullRequestNumber(comment.mergeRequest?.prNumber)}`,
    comment.mergeRequest?.title
      ? `**PR Title:** ${comment.mergeRequest.title}`
      : undefined,
    comment.filePath ? `**File:** ${comment.filePath}` : undefined,
    lineRange ? `**Lines:** ${lineRange}` : undefined,
    comment.addressed !== undefined
      ? `**Addressed:** ${comment.addressed ? "Yes" : "No"}`
      : undefined,
    comment.authorLogin ? `**Author:** ${comment.authorLogin}` : undefined,
    createdAt ? `**Created:** ${createdAt}` : undefined,
    "\n---\n",
    comment.body,
    comment.linkedMemory?.body
      ? `\n---\n\n## Linked Context\n\n${comment.linkedMemory.body}`
      : undefined,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          {commentUrl ? (
            <Action.OpenInBrowser
              title="Open Comment"
              icon={Icon.Globe}
              url={commentUrl}
            />
          ) : null}
          <Action.CopyToClipboard content={comment.body} />
        </ActionPanel>
      }
    />
  );
}
