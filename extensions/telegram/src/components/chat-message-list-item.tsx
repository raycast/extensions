import { List, ActionPanel, Action, Icon, Image } from "@raycast/api";
import { getAvatarIcon } from "../utils/avatar";
import { getMediaTypeIcon, getMediaDisplayTitle } from "../utils/media";
import { ChatMessage, Chat } from "../services/telegram-client";
import { ChatMessageListItemDetail } from "./chat-message-list-item-detail";
import { SendMessageForm } from "./send-message-form";
import { ToggleDetailAction, RefreshAction } from "./actions";

interface ChatMessageListItemProps {
  message: ChatMessage;
  chat: Chat;
  isShowingDetail: boolean;
  onRefresh: () => void;
  onToggleDetail: () => void;
}

export function ChatMessageListItem({
  message,
  chat,
  isShowingDetail,
  onRefresh,
  onToggleDetail,
}: ChatMessageListItemProps) {
  let displayTitle = message.text;
  if (!displayTitle && message.media) {
    displayTitle = getMediaDisplayTitle(message.media.type);
  }

  let icon: Image.ImageLike = Icon.Message;

  if (message.media?.filePath && (message.media.type === "photo" || message.media.type === "image")) {
    icon = { source: message.media.filePath };
  } else if (message.senderName) {
    icon = getAvatarIcon({
      photo: message.senderPhoto,
      name: message.senderName,
      type: "private",
    });
  } else if (message.media) {
    icon = getMediaTypeIcon(message.media.type);
  }

  const accessories: List.Item.Accessory[] = [];

  if (message.media?.filePath && (message.media.type === "photo" || message.media.type === "image")) {
    accessories.push({
      icon: { source: message.media.filePath },
    });
  }

  if (message.senderName) {
    accessories.push({
      text: message.senderName,
    });
  }

  accessories.push({
    date: message.date,
  });

  return (
    <List.Item
      key={message.id}
      icon={icon}
      title={displayTitle}
      accessories={accessories}
      detail={isShowingDetail ? <ChatMessageListItemDetail message={message} chat={chat} /> : undefined}
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.Pencil}
            title="Send Message"
            target={<SendMessageForm chat={chat} onSuccess={onRefresh} />}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          <Action.CopyToClipboard content={message.text} title="Copy Message" />
          <ToggleDetailAction isShowingDetail={isShowingDetail} onToggle={onToggleDetail} />
          <RefreshAction onRefresh={onRefresh} />
        </ActionPanel>
      }
    />
  );
}
