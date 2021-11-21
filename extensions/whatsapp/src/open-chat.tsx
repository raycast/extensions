import {ActionPanel, Icon, List, OpenInBrowserAction, showToast, ToastStyle} from "@raycast/api";
import {useWhatsappChats} from "./utils/use-whatsapp-chats";
import {WhatsAppChat} from "./utils/types";

export default function ChatList() {
  const [chats, setChats] = useWhatsappChats();

  const pinnedChats = chats.filter(chat => chat.pinned);
  const unpinnedChats = chats.filter(chat => !chat.pinned);

  const handlePin = async (chat: WhatsAppChat) => {
    const newChats = chats.map(c => {
      if (c.phone === chat.phone) {
        return { ...c, pinned: !c.pinned };
      }
      return c;
    });
    setChats(newChats);
    await showToast(ToastStyle.Success, `${!chat.pinned ? "Pinned" : "Unpinned"} chat with ${chat.name} `)
  };

  return (
    <List isLoading={chats.length === 0} searchBarPlaceholder="Filter chats by name...">
      {pinnedChats.length > 0 && (
        <List.Section title="Pinned Chats">
          {pinnedChats.map(chat => (
            <ChatListItem key={chat.phone} chat={chat} onPinAction={handlePin} />
          ))}
        </List.Section>
      )}
      {pinnedChats.length === 0 ? (
        <>
          {unpinnedChats.map(chat => (
            <ChatListItem key={chat.phone} chat={chat} onPinAction={handlePin} />
          ))}
        </>
      ) : (
        <List.Section title="Other Chats">
          {unpinnedChats.map(chat => (
            <ChatListItem key={chat.phone} chat={chat} onPinAction={handlePin} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

interface ChatListItemProps {
  chat: WhatsAppChat;
  onPinAction: (chat: WhatsAppChat) => void;
}

function ChatListItem({ chat, onPinAction }: ChatListItemProps) {
  const urlPhone = chat.phone.replace(/[^D]/, "");
  return (
    <List.Item
      id={chat.phone}
      title={chat.name}
      subtitle={chat.phone}
      icon="whatsapp.png"
      actions={
        <ActionPanel>
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
          <ActionPanel.Item
            title={chat.pinned ? "Unpin Chat" : "Pin Chat"}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            icon={Icon.Pin}
            onAction={() => onPinAction(chat)}
          />
        </ActionPanel>
      }
    />
  );
}