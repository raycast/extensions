import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { Chat, ChatTopic } from "../services/telegram-client";
import { getMediaDisplayTitle } from "../utils/media";
import { buildMarkdownWithMedia } from "../utils/markdown";
import { ChatMessagesView } from "./chat-messages-view";
import { SendMessageForm } from "./send-message-form";
import { RefreshAction, ToggleDetailAction } from "./actions";

interface ChatTopicListItemProps {
  chat: Chat;
  topic: ChatTopic;
  isShowingDetail: boolean;
  onRefresh: () => void;
  onToggleDetail: () => void;
}

function topicColor(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

function lastMessagePreview(topic: ChatTopic): string | undefined {
  const message = topic.lastMessage;
  if (!message) return undefined;

  const body = message.text || (message.media ? getMediaDisplayTitle(message.media.type) : "Message");
  const sender = message.isOutgoing ? "You" : message.senderName;
  return sender ? `${sender}: ${body}` : body;
}

export function ChatTopicListItem({ chat, topic, isShowingDetail, onRefresh, onToggleDetail }: ChatTopicListItemProps) {
  const preview = lastMessagePreview(topic);
  const accessories: List.Item.Accessory[] = [];

  if (topic.unreadCount > 0) {
    accessories.push({ tag: { value: topic.unreadCount.toString(), color: Color.Blue } });
  }
  if (topic.unreadMentionsCount > 0) {
    accessories.push({ tag: { value: `@${topic.unreadMentionsCount}`, color: Color.Orange } });
  }
  accessories.push({ date: topic.lastActivityDate });

  const icon = topic.isClosed
    ? Icon.Lock
    : topic.id === 1
      ? Icon.Message
      : { source: Icon.Hashtag, tintColor: topicColor(topic.iconColor) };

  const detailSender = topic.lastMessage?.isOutgoing ? "You" : topic.lastMessage?.senderName;
  const detailMarkdown = buildMarkdownWithMedia({
    prefix: detailSender ? `**${detailSender}**\n\n` : undefined,
    text: topic.lastMessage?.text || "No recent message preview is available.",
    media: topic.lastMessage?.media,
  });

  return (
    <List.Item
      icon={icon}
      title={topic.title}
      subtitle={!isShowingDetail ? preview : undefined}
      accessories={accessories}
      detail={
        isShowingDetail ? (
          <List.Item.Detail
            markdown={detailMarkdown}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Topic" text={topic.title} icon={Icon.Hashtag} />
                <List.Item.Detail.Metadata.Label
                  title="Status"
                  text={topic.isClosed ? "Closed" : topic.isHidden ? "Hidden" : "Open"}
                  icon={topic.isClosed ? Icon.Lock : Icon.CheckCircle}
                />
                <List.Item.Detail.Metadata.Label title="Unread" text={topic.unreadCount.toString()} />
                <List.Item.Detail.Metadata.Label title="Last Activity" text={topic.lastActivityDate.toLocaleString()} />
              </List.Item.Detail.Metadata>
            }
          />
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.Message}
            title="View Topic Messages"
            target={<ChatMessagesView chat={chat} topic={topic} />}
          />
          <Action.Push
            icon={Icon.Pencil}
            title="Send Message to Topic"
            target={<SendMessageForm chat={chat} topic={topic} onSuccess={onRefresh} />}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          <ToggleDetailAction isShowingDetail={isShowingDetail} onToggle={onToggleDetail} />
          <RefreshAction onRefresh={onRefresh} />
        </ActionPanel>
      }
    />
  );
}
