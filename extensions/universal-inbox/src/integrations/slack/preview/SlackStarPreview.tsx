import { PreviewDetail } from "../../../preview/PreviewDetail";
import { Notification } from "../../../notification";
import { slackMessageToMarkdown } from "../markdown";
import { SlackStar, SlackStarState } from "../types";
import { Color, Detail } from "@raycast/api";
import { match } from "ts-pattern";

interface SlackStarPreviewProps {
  notification: Notification;
  slack_star: SlackStar;
}

function starContent(star: SlackStar): { body: string; channel?: string } {
  return match(star.item)
    .with({ type: "Message" }, (item) => ({
      body: slackMessageToMarkdown(item.content.message),
      channel: item.content.channel.name,
    }))
    .with({ type: "File" }, (item) => ({ body: "_Starred file_", channel: item.content.channel.name }))
    .with({ type: "FileComment" }, (item) => ({ body: "_File comment_", channel: item.content.channel.name }))
    .with({ type: "Channel" }, (item) => ({
      body: `_Channel_ #${item.content.channel.name ?? item.content.channel.id}`,
      channel: item.content.channel.name,
    }))
    .with({ type: "Im" }, (item) => ({ body: "_Direct message_", channel: item.content.channel.name }))
    .with({ type: "Group" }, (item) => ({ body: "_Group message_", channel: item.content.channel.name }))
    .exhaustive();
}

export function SlackStarPreview({ notification, slack_star }: SlackStarPreviewProps) {
  const { body, channel } = starContent(slack_star);
  const markdown = `# ${notification.title}\n\n${body}`;

  const metadata = (
    <>
      <Detail.Metadata.TagList title="State">
        <Detail.Metadata.TagList.Item
          text={slack_star.state === SlackStarState.StarAdded ? "Starred" : "Unstarred"}
          color={slack_star.state === SlackStarState.StarAdded ? Color.Yellow : Color.SecondaryText}
        />
      </Detail.Metadata.TagList>
      {channel ? <Detail.Metadata.Label title="Channel" text={`#${channel}`} /> : null}
    </>
  );

  return <PreviewDetail notification={notification} markdown={markdown} metadata={metadata} />;
}
