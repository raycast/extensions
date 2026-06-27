import { Action, ActionPanel, Icon, List } from "@raycast/api";

import {
  addressedAccessory,
  formatDate,
  formatPullRequestNumber,
  formatRepository,
  getCommentUrl,
  truncate,
} from "../helpers/format";
import { GreptileComment } from "../types";
import { CommentDetail } from "./CommentDetail";

export function CommentListItem({ comment }: { comment: GreptileComment }) {
  const repository = formatRepository(comment.mergeRequest?.repository);
  const prLabel = formatPullRequestNumber(comment.mergeRequest?.prNumber);
  const commentUrl = getCommentUrl(comment);
  const line = comment.lineStart ? `:${comment.lineStart}` : "";
  const subtitle = [
    repository,
    prLabel,
    comment.filePath ? `${comment.filePath}${line}` : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  const accessories: List.Item.Accessory[] = [
    addressedAccessory(comment.addressed),
    { date: formatDate(comment.createdAt), tooltip: "Created" },
  ];

  return (
    <List.Item
      title={truncate(comment.body.replace(/\s+/g, " "), 100)}
      subtitle={subtitle}
      icon={Icon.SpeechBubble}
      keywords={[
        repository,
        prLabel,
        comment.filePath || "",
        comment.authorLogin || "",
      ]}
      accessories={accessories}
      actions={
        <ActionPanel title="Greptile Comment">
          <Action.Push
            title="Show Details"
            icon={Icon.Sidebar}
            target={<CommentDetail comment={comment} />}
          />
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
