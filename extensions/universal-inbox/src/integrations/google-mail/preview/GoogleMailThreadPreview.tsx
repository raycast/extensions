import { PreviewDetail } from "../../../preview/PreviewDetail";
import { GoogleMailMessage, GoogleMailThread } from "../types";
import { Notification } from "../../../notification";
import { formatDateTime } from "../../../utils";
import { Color, Detail } from "@raycast/api";

interface GoogleMailThreadPreviewProps {
  notification: Notification;
  googleMailThread: GoogleMailThread;
}

function header(message: GoogleMailMessage, name: string): string | undefined {
  return message.payload.headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;
}

export function GoogleMailThreadPreview({ notification, googleMailThread }: GoogleMailThreadPreviewProps) {
  const messages = googleMailThread.messages;
  const firstMessage = messages[0];
  const subject = (firstMessage && header(firstMessage, "Subject")) || notification.title;

  const isStarred = messages.some((m) => m.labelIds?.includes("STARRED"));
  const isImportant = messages.some((m) => m.labelIds?.includes("IMPORTANT"));

  const body = messages
    .map((message) => {
      const from = header(message, "From") ?? "Unknown sender";
      const date = formatDateTime(message.internalDate);
      return `**${from}** · ${date}\n\n${message.snippet}`;
    })
    .join("\n\n---\n\n");

  const markdown = `# ${subject}\n\n${body}`;

  const metadata = (
    <>
      {firstMessage ? <Detail.Metadata.Label title="From" text={header(firstMessage, "From") ?? "Unknown"} /> : null}
      <Detail.Metadata.Label title="Subject" text={subject} />
      <Detail.Metadata.Label title="Messages" text={`${messages.length}`} />
      {isStarred || isImportant ? (
        <Detail.Metadata.TagList title="Labels">
          {isStarred ? <Detail.Metadata.TagList.Item text="Starred" color={Color.Yellow} /> : null}
          {isImportant ? <Detail.Metadata.TagList.Item text="Important" color={Color.Red} /> : null}
        </Detail.Metadata.TagList>
      ) : null}
    </>
  );

  return <PreviewDetail notification={notification} markdown={markdown} metadata={metadata} />;
}
