import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { Chat } from "../services/telegram-client";
import { getAvatarIcon } from "../utils/avatar";
import { ChatMessagesView } from "./chat-messages-view";
import { ChatTopicsView } from "./chat-topics-view";
import { ChatListItemDetail } from "./chat-list-item-detail";
import { SendMessageForm } from "./send-message-form";
import { ToggleDetailAction, RefreshAction } from "./actions";

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

  if (chat.isForum) {
    accessories.push({ icon: Icon.Hashtag, tooltip: "Forum group" });
  }

  if (chat.unreadCount > 0) {
    accessories.push({
      tag: { value: chat.unreadCount.toString(), color: Color.Blue },
    });
  }

  if (chat.lastMessage?.date) {
    accessories.push({
      date: chat.lastMessage.date,
    });
  }

  return (
    <List.Item
      key={chat.id}
      icon={icon}
      title={displayTitle}
      subtitle={!isShowingDetail ? chat.lastMessage?.text : undefined}
      accessories={accessories}
      detail={isShowingDetail ? <ChatListItemDetail chat={chat} /> : undefined}
      actions={
        <ActionPanel>
          <Action.Push
            icon={chat.isForum ? Icon.Hashtag : Icon.Message}
            title={chat.isForum ? "View Topics" : "View Messages"}
            target={chat.isForum ? <ChatTopicsView chat={chat} /> : <ChatMessagesView chat={chat} />}
          />
          {chat.isForum ? (
            <Action.Push icon={Icon.Message} title="View All Messages" target={<ChatMessagesView chat={chat} />} />
          ) : null}
          <Action.Push
            icon={Icon.Pencil}
            title={chat.isForum ? "Send to General" : "Send Message"}
            target={<SendMessageForm chat={chat} onSuccess={onRefresh} />}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          <ToggleDetailAction isShowingDetail={isShowingDetail} onToggle={onToggleDetail} />
          <RefreshAction onRefresh={onRefresh} />
        </ActionPanel>
      }
    />
  );
}
