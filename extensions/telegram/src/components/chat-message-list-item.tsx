import { List, ActionPanel, Action, Icon, Image } from "@raycast/api";
import { getAvatarIcon } from "../utils/avatar";
import { getMediaTypeIcon, getMediaDisplayTitle } from "../utils/media";
import { ChatMessage, Chat, ChatTopic } from "../services/telegram-client";
import { ChatMessageListItemDetail } from "./chat-message-list-item-detail";
import { SendMessageForm } from "./send-message-form";
import { ToggleDetailAction, RefreshAction } from "./actions";

interface ChatMessageListItemProps {
  message: ChatMessage;
  chat: Chat;
  topic?: ChatTopic;
  isShowingDetail: boolean;
  onRefresh: () => void;
  onToggleDetail: () => void;
  onShowConversation: () => void;
}

export function ChatMessageListItem({
  message,
  chat,
  topic,
  isShowingDetail,
  onRefresh,
  onToggleDetail,
  onShowConversation,
}: ChatMessageListItemProps) {
  const sender = message.isOutgoing ? "You" : message.senderName || chat.title;
  const displayTitle = message.text || (message.media ? getMediaDisplayTitle(message.media.type) : "Message");

  let icon: Image.ImageLike = Icon.Message;

  if (message.senderName || message.isOutgoing) {
    icon = getAvatarIcon({
      photo: message.senderPhoto,
      name: sender,
      type: "private",
    });
  } else if (message.media) {
    icon = getMediaTypeIcon(message.media.type);
  }

  const accessories: List.Item.Accessory[] = [];

  if (message.media) {
    accessories.push({
      icon: getMediaTypeIcon(message.media.type),
      tooltip: getMediaDisplayTitle(message.media.type),
    });
  }

  accessories.push({
    text: message.date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
    tooltip: message.date.toLocaleString(),
  });

  return (
    <List.Item
      key={message.id}
      id={message.id.toString()}
      icon={icon}
      title={sender}
      subtitle={!isShowingDetail ? displayTitle : undefined}
      accessories={accessories}
      detail={isShowingDetail ? <ChatMessageListItemDetail message={message} chat={chat} topic={topic} /> : undefined}
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.Pencil}
            title="Send Message"
            target={<SendMessageForm chat={chat} topic={topic} onSuccess={onRefresh} />}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          <Action icon={Icon.Bubble} title="Show Reading View" onAction={onShowConversation} />
          {message.text ? <Action.CopyToClipboard content={message.text} title="Copy Message" /> : null}
          <ToggleDetailAction isShowingDetail={isShowingDetail} onToggle={onToggleDetail} />
          <RefreshAction onRefresh={onRefresh} />
        </ActionPanel>
      }
    />
  );
}
