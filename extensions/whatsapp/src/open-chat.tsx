import { ActionPanel, clearSearchBar, Color, Icon, List, OpenInBrowserAction, PushAction } from "@raycast/api";
import { useWhatsAppChats } from "./utils/use-whatsapp-chats";
import { WhatsAppChat } from "./utils/types";
import WhatsAppChatForm from "./create-chat";
import { useState } from "react";

export default function ChatList() {
  const [chats, setChats] = useWhatsAppChats();
  const [selectedId, setSelectId] = useState<string>();

  const pinnedChats = chats.filter(chat => chat.pinned);
  const unpinnedChats = chats.filter(chat => !chat.pinned);

  const handlePin = async (chat: WhatsAppChat) => {
    const newChats = chats.map(c => {
      if (c.id === chat.id) {
        return { ...c, pinned: !c.pinned };
      }
      return c;
    });
    setChats(newChats);
    setSelectId(chat.id);
    await clearSearchBar({ forceScrollToTop: true });
  };

  const handleDelete = async (chat: WhatsAppChat) => {
    const newChats = chats.filter(c => c.id !== chat.id);
    setChats(newChats);
  };

  return (
    <List isLoading={chats.length === 0} selectedItemId={selectedId} searchBarPlaceholder="Filter chats by name...">
      {pinnedChats.length > 0 && (
        <List.Section title="Pinned Chats">
          {pinnedChats.map(chat => (
            <ChatListItem key={chat.id} chat={chat} onPinAction={handlePin} onDeleteChat={handleDelete} />
          ))}
        </List.Section>
      )}
      {pinnedChats.length === 0 ? (
        <>
          {unpinnedChats.map(chat => (
            <ChatListItem key={chat.id} chat={chat} onPinAction={handlePin} onDeleteChat={handleDelete} />
          ))}
        </>
      ) : (
        <List.Section title="Other Chats">
          {unpinnedChats.map(chat => (
            <ChatListItem key={chat.id} chat={chat} onPinAction={handlePin} onDeleteChat={handleDelete} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

interface ChatListItemProps {
  chat: WhatsAppChat;
  onPinAction: (chat: WhatsAppChat) => void;
  onDeleteChat: (chat: WhatsAppChat) => void;
}

function ChatListItem({ chat, onPinAction, onDeleteChat }: ChatListItemProps) {
  const urlPhone = chat.phone.replace(/[^D]/, "");
  return (
    <List.Item
      id={chat.id}
      title={chat.name}
      subtitle={chat.phone}
      icon="whatsapp.png"
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenInBrowserAction
              title="Open in WhatsApp"
              icon="whatsapp-outline.png"
              url={`whatsapp://send?phone=${urlPhone}&text=`} // The empty text parameter is used to focus the chat automatically
            />
            <OpenInBrowserAction
              title="Open in Browser"
              icon={Icon.Globe}
              url={`https://web.whatsapp.com/send?phone=${urlPhone}&text=`}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <ActionPanel.Item
              title={chat.pinned ? "Unpin Chat" : "Pin Chat"}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              icon={Icon.Pin}
              onAction={() => onPinAction(chat)}
            />
            <PushAction
              title="Edit Chat"
              icon={Icon.Pencil}
              target={<WhatsAppChatForm defaultValues={chat} />}
            />
            <ActionPanel.Item
              title="Delete Chat"
              icon={{ source: Icon.Trash, tintColor: Color.Red }}
              onAction={() => onDeleteChat(chat)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}