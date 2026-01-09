import { List, ActionPanel, Action, Icon, Image } from "@raycast/api";
import { getAvatarIcon } from "../utils/avatar";
import { ChatMessage, Chat } from "../services/telegram-client";
import { ChatMessageListItemDetail } from "./chat-message-list-item-detail";
import { SendMessageForm } from "./send-message-form";

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
    const typeName = message.media.type.charAt(0).toUpperCase() + message.media.type.slice(1);
    displayTitle = typeName;
  }

  let icon: Image.ImageLike = Icon.Message;

  // For group chats, show sender avatar
  if (chat.type === "group" && message.senderName) {
    icon = getAvatarIcon({
      photo: message.senderPhoto,
      name: message.senderName,
      type: "private",
    });
  } else if (message.media) {
    // For non-group messages with media, show media icon
    switch (message.media.type) {
      case "photo":
      case "image":
        icon = Icon.Image;
        break;
      case "video":
      case "gif":
        icon = Icon.Video;
        break;
      case "audio":
      case "voice":
        icon = Icon.Music;
        break;
      case "file":
      case "document":
        icon = Icon.Document;
        break;
      case "link":
        icon = Icon.Link;
        break;
      case "location":
        icon = Icon.Pin;
        break;
      case "contact":
        icon = Icon.Person;
        break;
      case "poll":
        icon = Icon.BarChart;
        break;
      case "sticker":
        icon = Icon.Emoji;
        break;
      default:
        icon = Icon.Paperclip;
    }
  }

  const accessories: List.Item.Accessory[] = [];

  // Add sender name for group chats
  if (chat.type === "group" && message.senderName) {
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
          <Action
            icon={isShowingDetail ? Icon.AppWindowSidebarLeft : Icon.AppWindowSidebarRight}
            title={isShowingDetail ? "Hide Detail" : "Show Detail"}
            onAction={onToggleDetail}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          />
          <Action
            icon={Icon.ArrowClockwise}
            title="Refresh"
            onAction={onRefresh}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
}
