import { Icon, List } from "@raycast/api";
import { ChatMessage, Chat, ChatTopic } from "../services/telegram-client";
import { buildMarkdownWithMedia } from "../utils/markdown";
import { getMediaDisplayTitle } from "../utils/media";

interface ChatMessageListItemDetailProps {
  message: ChatMessage;
  chat: Chat;
  topic?: ChatTopic;
}

export function ChatMessageListItemDetail({ message, chat, topic }: ChatMessageListItemDetailProps) {
  const sender = message.isOutgoing ? "You" : message.senderName || chat.title;
  const markdown = buildMarkdownWithMedia({
    prefix: `**${sender}**\n\n`,
    text: message.text,
    media: message.media,
  });

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Sender" text={sender} icon={Icon.Person} />
          <List.Item.Detail.Metadata.Label title="Sent" text={message.date.toLocaleString()} icon={Icon.Clock} />
          {topic ? <List.Item.Detail.Metadata.Label title="Topic" text={topic.title} icon={Icon.Hashtag} /> : null}
          {message.media ? (
            <List.Item.Detail.Metadata.Label
              title="Attachment"
              text={getMediaDisplayTitle(message.media.type)}
              icon={Icon.Paperclip}
            />
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
