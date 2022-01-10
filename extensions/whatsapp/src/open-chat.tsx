import { ActionPanel, Color, CopyToClipboardAction, Icon, List, OpenInBrowserAction, PushAction } from "@raycast/api";
import { useWhatsAppChats } from "./utils/use-whatsapp-chats";
import { isGroupChat, isPhoneChat, WhatsAppChat } from "./utils/types";
import WhatsAppPhoneChatForm from "./add-chat";
import { useState } from "react";
import WhatsAppGroupChatForm from "./add-existing-group";
import formatTimeDistance from "fromnow";

export default function ChatList() {
  const { chats, isLoading, updateChats } = useWhatsAppChats();
  const [selectedItemId, setSelectedItemId] = useState<string>();

  const pinnedChats = chats.filter((chat) => chat.pinned).sort((a, b) => (b.lastOpened || 0) - (a.lastOpened || 0));
  const unpinnedChats = chats.filter((chat) => !chat.pinned).sort((a, b) => (b.lastOpened || 0) - (a.lastOpened || 0));

  async function handlePin(chat: WhatsAppChat) {
    const newChats = chats.map((c) => {
      if (c.id === chat.id) {
        return { ...c, pinned: !c.pinned };
      }
      return c;
    });
    await updateChats(newChats);
    setSelectedItemId(chat.id);
  }

  async function handleDelete(chat: WhatsAppChat) {
    const newChats = chats.filter((c) => c.id !== chat.id);
    await updateChats(newChats);
  }

  async function handleOpen(chat: WhatsAppChat) {
    const newChats = chats.map((c) => {
      if (c.id === chat.id) {
        return { ...c, lastOpened: Date.now() };
      }
      return c;
    });
    await updateChats(newChats);
  }

  return (
    <List isLoading={isLoading} selectedItemId={selectedItemId} searchBarPlaceholder="Filter chats by name...">
      {pinnedChats.length > 0 ? (
        <List.Section title="Pinned Chats">
          {pinnedChats.map((chat) => (
            <ChatListItem
              key={chat.id}
              chat={chat}
              onPinAction={handlePin}
              onDeleteChat={handleDelete}
              onOpenChat={handleOpen}
            />
          ))}
        </List.Section>
      ) : null}
      {pinnedChats.length === 0 ? (
        <>
          {unpinnedChats.map((chat) => (
            <ChatListItem
              key={chat.id}
              chat={chat}
              onPinAction={handlePin}
              onDeleteChat={handleDelete}
              onOpenChat={handleOpen}
            />
          ))}
        </>
      ) : (
        <List.Section title="Other Chats">
          {unpinnedChats.map((chat) => (
            <ChatListItem
              key={chat.id}
              chat={chat}
              onPinAction={handlePin}
              onDeleteChat={handleDelete}
              onOpenChat={handleOpen}
            />
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
  onOpenChat: (chat: WhatsAppChat) => void;
}

function getChatItemProps(chat: WhatsAppChat) {
  const accessoryTitle = chat.lastOpened ? formatTimeDistance(chat.lastOpened, { suffix: true, max: 1 }) : "";
  if (isPhoneChat(chat)) {
    const phone = chat.phone.replace(/[^D]/, "");
    return {
      title: chat.name,
      subtitle: chat.phone,
      accessoryTitle,
      appUrl: `whatsapp://send?phone=${phone}&text=`,
      webUrl: `https://web.whatsapp.com/send?phone=${phone}&text=`,
      icon: Icon.Person,
      keywords: [chat.phone, phone],
      form: <WhatsAppPhoneChatForm defaultValue={chat} />,
    };
  } else {
    return {
      title: chat.name,
      subtitle: "Group",
      accessoryTitle,
      appUrl: `whatsapp://chat?code=${chat.groupCode}`,
      webUrl: null,
      icon: Icon.Circle,
      keywords: [chat.groupCode, "group"],
      form: <WhatsAppGroupChatForm defaultValue={chat} />,
    };
  }
}

function ChatListItem({ chat, onPinAction, onDeleteChat, onOpenChat }: ChatListItemProps) {
  const { title, accessoryTitle, icon, keywords, subtitle, appUrl, webUrl, form } = getChatItemProps(chat);

  return (
    <List.Item
      id={chat.id}
      title={title}
      subtitle={subtitle}
      icon={icon}
      accessoryTitle={accessoryTitle}
      keywords={keywords}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenInBrowserAction
              title="Open in WhatsApp"
              icon="whatsapp-outline.png"
              url={appUrl}
              onOpen={() => onOpenChat(chat)}
            />
            {webUrl ? (
              <OpenInBrowserAction title="Open in Web" icon={Icon.Globe} url={webUrl} onOpen={() => onOpenChat(chat)} />
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <ActionPanel.Item
              title={chat.pinned ? "Unpin Chat" : "Pin Chat"}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              icon={Icon.Pin}
              onAction={() => onPinAction(chat)}
            />
            <PushAction title="Edit Chat" icon={Icon.Pencil} target={form} />
            <ActionPanel.Item
              title="Delete Chat"
              icon={{ source: Icon.Trash, tintColor: Color.Red }}
              onAction={() => onDeleteChat(chat)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <CopyToClipboardAction content={chat.name} title="Copy Name" />
            {isGroupChat(chat) ? (
              <CopyToClipboardAction content={`https://chat.whatsapp.com/${chat.groupCode}`} title="Copy Invite Link" />
            ) : (
              <CopyToClipboardAction content={chat.phone} title="Copy Phone Number" />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
