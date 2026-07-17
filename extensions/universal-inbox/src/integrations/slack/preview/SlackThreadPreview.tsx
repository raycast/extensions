import { slackMessageToMarkdown, slackSenderName } from "../markdown";
import { PreviewDetail } from "../../../preview/PreviewDetail";
import { Notification } from "../../../notification";
import { formatElapsedTime } from "../../../utils";
import { SlackThread } from "../types";
import { Detail } from "@raycast/api";

interface SlackThreadPreviewProps {
  notification: Notification;
  slack_thread: SlackThread;
}

export function SlackThreadPreview({ notification, slack_thread }: SlackThreadPreviewProps) {
  const channelName = slack_thread.channel.name ?? slack_thread.channel.id;

  const body = slack_thread.messages
    .map((message) => {
      const sender = slackSenderName(message, slack_thread.sender_profiles);
      const when = message.ts ? ` · ${formatElapsedTime(new Date(parseFloat(message.ts) * 1000))}` : "";
      return `**${sender}**${when}\n\n${slackMessageToMarkdown(message, slack_thread.references)}`;
    })
    .join("\n\n---\n\n");

  const markdown = `# ${notification.title}\n\n${body}`;

  const metadata = (
    <>
      <Detail.Metadata.Link title="Channel" target={slack_thread.url} text={`#${channelName}`} />
      {slack_thread.team.name ? <Detail.Metadata.Label title="Team" text={slack_thread.team.name} /> : null}
      <Detail.Metadata.Label title="Messages" text={`${slack_thread.messages.length}`} />
      <Detail.Metadata.Label title="Subscribed" text={slack_thread.subscribed ? "Yes" : "No"} />
    </>
  );

  return <PreviewDetail notification={notification} markdown={markdown} metadata={metadata} />;
}
