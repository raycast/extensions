import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { Chat } from "../services/telegram-client";
import { getAvatarIcon } from "../utils/avatar";
import { ChatMessagesView } from "./chat-messages-view";
import { ChatListItemDetail } from "./chat-list-item-detail";
import { SendMessageForm } from "./send-message-form";

interface ChatListItemProps {
  chat: Chat;
  isShowingDetail: boolean;
  onRefresh: () => void;
  onToggleDetail: () => void;
}

export function ChatListItem({ chat, onRefresh, isShowingDetail, onToggleDetail }: ChatListItemProps) {
  const displayTitle = chat.title;
  const icon = getAvatarIcon({
    photo: chat.photo,
    name: chat.title,
    type: chat.type,
  });

  const accessories: List.Item.Accessory[] = [];

  if (chat.unreadCount > 0) {
    accessories.push({
      tag: { value: chat.unreadCount.toString(), color: Color.Blue },
    });
  }

  if (chat.lastMessageDate) {
    accessories.push({
      date: chat.lastMessageDate,
    });
  }

  return (
    <List.Item
      key={chat.id}
      icon={icon}
      title={displayTitle}
      subtitle={!isShowingDetail ? chat.lastMessage : undefined}
      accessories={accessories}
      detail={isShowingDetail ? <ChatListItemDetail chat={chat} /> : undefined}
      actions={
        <ActionPanel>
          <Action.Push icon={Icon.Message} title="View Messages" target={<ChatMessagesView chat={chat} />} />
          <Action.Push
            icon={Icon.Pencil}
            title="Send Message"
            target={<SendMessageForm chat={chat} onSuccess={onRefresh} />}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
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
