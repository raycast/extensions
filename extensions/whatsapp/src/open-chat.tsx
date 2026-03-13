import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard, List } from "@raycast/api";
import { useWhatsAppChats } from "./utils/use-whatsapp-chats";
import { isGroupChat, isPhoneChat, WhatsAppChat } from "./utils/types";
import WhatsAppPhoneChatForm from "./add-chat";
import { useState } from "react";
import WhatsAppGroupChatForm from "./add-existing-group";
import formatTimeDistance from "fromnow";

export default function ChatList() {
  const [chats, setChats] = useWhatsAppChats();
  const [selectedItemId, setSelectedItemId] = useState<string>();

  const pinnedChats = chats.filter((chat) => chat.pinned).sort((a, b) => (b.lastOpened || 0) - (a.lastOpened || 0));
  const unpinnedChats = chats.filter((chat) => !chat.pinned).sort((a, b) => (b.lastOpened || 0) - (a.lastOpened || 0));

  function handlePin(chat: WhatsAppChat) {
    const newChats = chats.map((c) => {
      if (c.id === chat.id) {
        return { ...c, pinned: !c.pinned };
      }
      return c;
    });
    setChats(newChats);
    setSelectedItemId(chat.id);
  }

  function handleDelete(chat: WhatsAppChat) {
    const newChats = chats.filter((c) => c.id !== chat.id);
    setChats(newChats);
  }

  function handleOpen(chat: WhatsAppChat) {
    const newChats = chats.map((c) => {
      if (c.id === chat.id) {
        return { ...c, lastOpened: Date.now() };
      }
      return c;
    });
    setChats(newChats);
  }

  return (
    <List selectedItemId={selectedItemId} searchBarPlaceholder="Filter chats by name...">
      {chats.length === 0 ? (
        <List.EmptyView
          icon={Icon.Person}
          title="Add a chat to get started"
          description="Until WhatsApp releases a public API you will need to add contacts and groups manually using the other commands"
          actions={
            <ActionPanel>
              <Action.Push title="Add First Contact" target={<WhatsAppPhoneChatForm />} />
            </ActionPanel>
          }
        />
      ) : null}
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
      icon: Icon.TwoPeople,
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
      accessories={[{ text: accessoryTitle, tooltip: "Last opened" }]}
      keywords={keywords}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open in Whatsapp"
              icon="whatsapp-outline.png"
              url={appUrl}
              onOpen={() => onOpenChat(chat)}
            />
            {webUrl ? (
              <Action.OpenInBrowser
                title="Open in Web"
                icon={Icon.Globe}
                url={webUrl}
                onOpen={() => onOpenChat(chat)}
              />
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={chat.pinned ? "Unpin Chat" : "Pin Chat"}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              icon={Icon.Pin}
              onAction={() => onPinAction(chat)}
            />
            <Action.Push title="Edit Chat" icon={Icon.Pencil} target={form} shortcut={Keyboard.Shortcut.Common.Edit} />
            <Action
              title="Delete Chat"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={async () => {
                if (
                  await confirmAlert({
                    title: `Delete "${chat.name}"`,
                    message: `Are you sure you want to delete this chat?`,
                    icon: Icon.Trash,
                    primaryAction: {
                      title: "Delete",
                      style: Alert.ActionStyle.Destructive,
                    },
                  })
                ) {
                  onDeleteChat(chat);
                }
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard content={chat.name} title="Copy Name" />
            {isGroupChat(chat) ? (
              <Action.CopyToClipboard
                content={`https://chat.whatsapp.com/${chat.groupCode}`}
                title="Copy Invite Link"
              />
            ) : (
              <Action.CopyToClipboard content={chat.phone} title="Copy Phone Number" />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Push icon={Icon.Person} title="Add Chat" target={<WhatsAppPhoneChatForm />} />
            <Action.Push icon={Icon.TwoPeople} title="Add Existing Group" target={<WhatsAppGroupChatForm />} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
