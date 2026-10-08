import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChatView } from "./components/ChatView";
import { Chat } from "./lib/chats";
import { removeOldFiles } from "./lib/clipboard-image";
import { getChatStore, getWorkDirectory } from "./lib/storage";

export default function Command() {
  const store = useMemo(getChatStore, []);
  const { push } = useNavigation();
  const [chats, setChats] = useState<Chat[]>();
  const [searchText, setSearchText] = useState("");
  const question = searchText.trim();

  const reload = useCallback(async () => setChats(await store.list()), [store]);

  useEffect(() => {
    reload();
    // Transcripts are removed after each request. This catches any left behind when Raycast quit mid-request.
    removeOldFiles(getWorkDirectory());
  }, [reload]);

  const openChat = (chatId?: string, initialQuestion?: string) =>
    push(<ChatView chatId={chatId} initialQuestion={initialQuestion} onChange={reload} />);

  async function deleteChat(chat: Chat) {
    const confirmed = await confirmAlert({
      title: `Delete "${chat.title}"?`,
      message: "The conversation is removed from this Mac.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await store.delete(chat.id);
    await showToast({ style: Toast.Style.Success, title: "Chat deleted" });
    await reload();
  }

  // Text typed in the search bar that matches no chat can start a new chat as its first message.
  const newChatAction = (
    <Action
      title={question ? "Ask in New Chat" : "New Chat"}
      icon={Icon.PlusCircle}
      shortcut={Keyboard.Shortcut.Common.New}
      onAction={() => {
        setSearchText("");
        openChat(undefined, question);
      }}
    />
  );
  const hasChats = (chats?.length ?? 0) > 0;

  return (
    <List
      isLoading={chats === undefined}
      searchBarPlaceholder="Search chats, or type a question for a new chat"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering
    >
      <List.EmptyView
        icon={Icon.SpeechBubble}
        title={hasChats ? "No matching chats" : "No chats yet"}
        description={
          question ? "Press Enter to ask this in a new chat." : "Press Enter to start a chat with the on-device model."
        }
        actions={<ActionPanel>{newChatAction}</ActionPanel>}
      />
      {chats?.map((chat) => {
        const lastAnswer = [...chat.messages].reverse().find((message) => message.role === "assistant");
        return (
          <List.Item
            key={chat.id}
            title={chat.title}
            subtitle={lastAnswer?.content
              .replace(/[*#`>]+/g, "")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 80)}
            icon={Icon.SpeechBubble}
            accessories={[
              ...(chat.draft ? [{ tag: "Draft", tooltip: `Not sent yet: ${chat.draft}` }] : []),
              { text: `${chat.messages.length} messages` },
              { date: new Date(chat.updatedAt), tooltip: `Last message: ${new Date(chat.updatedAt).toLocaleString()}` },
            ]}
            actions={
              <ActionPanel>
                <Action title="Open Chat" icon={Icon.Message} onAction={() => openChat(chat.id)} />
                {newChatAction}
                <Action.Push
                  title="Rename Chat"
                  icon={Icon.Pencil}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  target={
                    <RenameForm
                      title={chat.title}
                      onRename={async (title) => {
                        await store.save({ ...chat, title });
                        await reload();
                      }}
                    />
                  }
                />
                <Action
                  title="Delete Chat"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => deleteChat(chat)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function RenameForm({ title, onRename }: { title: string; onRename: (title: string) => Promise<void> }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle="Rename Chat"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Rename Chat"
            onSubmit={async (values: { title: string }) => {
              const newTitle = values.title.trim();
              if (!newTitle) {
                await showToast({ style: Toast.Style.Failure, title: "The title cannot be empty" });
                return;
              }
              await onRename(newTitle);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" defaultValue={title} />
    </Form>
  );
}
