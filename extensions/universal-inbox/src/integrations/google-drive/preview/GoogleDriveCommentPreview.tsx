import { PreviewDetail } from "../../../preview/PreviewDetail";
import { Notification } from "../../../notification";
import { GoogleDriveComment } from "../types";
import { Color, Detail } from "@raycast/api";

interface GoogleDriveCommentPreviewProps {
  notification: Notification;
  comment: GoogleDriveComment;
}

export function GoogleDriveCommentPreview({ notification, comment }: GoogleDriveCommentPreviewProps) {
  const quotedSection = comment.quoted_file_content
    ? `> ${comment.quoted_file_content.split("\n").join("\n> ")}\n\n`
    : "";

  const replyLines = comment.replies.map((r) => `**${r.author.display_name}:** ${r.content}`).join("\n\n");

  const markdown = [
    `# ${comment.file_name}`,
    ``,
    `**Comment by ${comment.author.display_name}:**`,
    ``,
    quotedSection + comment.content,
    replyLines ? `\n---\n\n### Replies\n\n${replyLines}` : null,
  ]
    .filter((line) => line !== null)
    .join("\n");

  const metadata = (
    <>
      <Detail.Metadata.Label title="File" text={comment.file_name} />
      <Detail.Metadata.Label title="Author" text={comment.author.display_name} />
      <Detail.Metadata.Label title="Replies" text={`${comment.replies.length}`} />
      <Detail.Metadata.TagList title="Status">
        <Detail.Metadata.TagList.Item
          text={comment.resolved ? "Resolved" : "Open"}
          color={comment.resolved ? Color.Green : Color.Yellow}
        />
      </Detail.Metadata.TagList>
    </>
  );

  return <PreviewDetail notification={notification} markdown={markdown} metadata={metadata} />;
}
