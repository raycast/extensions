import { PreviewDetail } from "../../../preview/PreviewDetail";
import { SlackReaction, SlackReactionState } from "../types";
import { Notification } from "../../../notification";
import { slackMessageToMarkdown } from "../markdown";
import { Color, Detail } from "@raycast/api";
import { match } from "ts-pattern";

interface SlackReactionPreviewProps {
  notification: Notification;
  slack_reaction: SlackReaction;
}

function reactionContent(reaction: SlackReaction): { body: string; channel?: string } {
  return match(reaction.item)
    .with({ type: "Message" }, (item) => ({
      body: slackMessageToMarkdown(item.content.message),
      channel: item.content.channel.name,
    }))
    .with({ type: "File" }, (item) => ({ body: "_Reacted file_", channel: item.content.channel.name }))
    .exhaustive();
}

export function SlackReactionPreview({ notification, slack_reaction }: SlackReactionPreviewProps) {
  const { body, channel } = reactionContent(slack_reaction);
  const markdown = `# ${notification.title}\n\n:${slack_reaction.name}:\n\n${body}`;

  const metadata = (
    <>
      <Detail.Metadata.TagList title="State">
        <Detail.Metadata.TagList.Item
          text={slack_reaction.state === SlackReactionState.ReactionAdded ? "Added" : "Removed"}
          color={slack_reaction.state === SlackReactionState.ReactionAdded ? Color.Green : Color.SecondaryText}
        />
      </Detail.Metadata.TagList>
      <Detail.Metadata.Label title="Reaction" text={`:${slack_reaction.name}:`} />
      {channel ? <Detail.Metadata.Label title="Channel" text={`#${channel}`} /> : null}
    </>
  );

  return <PreviewDetail notification={notification} markdown={markdown} metadata={metadata} />;
}
