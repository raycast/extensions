import { Action, ActionPanel, closeMainWindow, Color, Icon, List, showHUD, showToast, Toast } from "@raycast/api";
import formatTimeDistance from "fromnow";
import osascript from "osascript-tag";
import { useState } from "react";
import SignalChatForm from "./add-chat";
import { SignalChat } from "./utils/types";
import { useSignalChats } from "./utils/use-signal-chats";

export default function ChatList() {
  const { chats, isLoading, updateChats } = useSignalChats();
  const [selectedItemId, setSelectedItemId] = useState<string>();

  const pinnedChats = chats.filter((chat) => chat.pinned).sort((a, b) => (b.lastOpened || 0) - (a.lastOpened || 0));
  const unpinnedChats = chats.filter((chat) => !chat.pinned).sort((a, b) => (b.lastOpened || 0) - (a.lastOpened || 0));

  async function handlePin(chat: SignalChat) {
    const newChats = chats.map((c) => {
      if (c.id === chat.id) {
        return { ...c, pinned: !c.pinned };
      }
      return c;
    });
    await updateChats(newChats);
    setSelectedItemId(chat.id);
  }

  async function handleDelete(chat: SignalChat) {
    const newChats = chats.filter((c) => c.id !== chat.id);
    await updateChats(newChats);
  }

  async function handleOpen(chat: SignalChat) {
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
      {!isLoading && chats.length === 0 ? (
        <List.EmptyView
          icon={Icon.Person}
          title="Add a chat to get started"
          description="Until Signal releases a public API you will need to add contacts manually using the other commands"
          actions={
            <ActionPanel>
              <Action.Push title="Add First Contact" target={<SignalChatForm />} />
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
  chat: SignalChat;
  onPinAction: (chat: SignalChat) => void;
  onDeleteChat: (chat: SignalChat) => void;
  onOpenChat: (chat: SignalChat) => void;
}

function getChatItemProps(chat: SignalChat) {
  const accessoryTitle = chat.lastOpened ? formatTimeDistance(chat.lastOpened, { suffix: true, max: 1 }) : "";
  //   if (isSignalChat(chat)) {
  return {
    title: chat.name,
    subtitle: chat.phone,
    accessoryTitle,
    appUrl: `sgnl://signal.me/#p/${chat.phone}`,
    webUrl: `https://signal.me/#p/${chat.phone}`,
    icon: Icon.Person,
    keywords: [chat.phone],
    form: <SignalChatForm defaultValue={chat} />,
  };
  //   }
}
const executeJxa = async (script: string) => {
  try {
    const result = await osascript.jxa({ parse: true })`${script}`;
    return result;
  } catch (err: unknown) {
    if (typeof err === "string") {
      const message = err.replace("execution error: Error: ", "");
      console.log(err);
      showToast(Toast.Style.Failure, "Something went wrong", message);
    }
  }
};

async function openSingalUrl(url: string) {
  const result = executeJxa(`
  const app = Application("Signal");
var running = app.running();
app.activate();
if (running){
  app.includeStandardAdditions = true;
  app.openLocation('${url}');
}
return running;
  `);

  result.then((value) => {
    console.log("result is " + value);
    if (!value) {
      showHUD("Signal not opened, opening...");
      setTimeout(() => {
        openSingalUrl(url);
      }, 6000);
    }
    closeMainWindow();
  });
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
            <Action
              title="Open in Signal"
              icon={Icon.Message}
              onAction={() => {
                openSingalUrl(appUrl);
                onOpenChat(chat);
              }}
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
            <Action.Push title="Edit Chat" icon={Icon.Pencil} target={form} />
            <Action
              title="Delete Chat"
              icon={{ source: Icon.Trash, tintColor: Color.Red }}
              onAction={() => onDeleteChat(chat)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard content={chat.name} title="Copy Name" />
            <Action.CopyToClipboard content={chat.phone} title="Copy Phone Number" />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
