import { Action, ActionPanel, Alert, Icon, List, confirmAlert, useNavigation } from "@raycast/api";
import { useEffect, useRef } from "react";
import { useChats } from "../hooks/useChats";
import { createChat, renameChat } from "../lib/chats/operations";
import type { Chat } from "../lib/chats/types";
import type { ChatSeed } from "../lib/launch-context";
import { ChatSettingsForm } from "./ChatSettingsForm";
import { ChatView } from "./ChatView";
import { RenameChatForm } from "./RenameChatForm";

export function ChatList(props: { seed?: ChatSeed }) {
  const { chats, isLoading, readOnly, notice, mutate } = useChats();
  const { push, pop } = useNavigation();
  const seedHandled = useRef(false);

  const sorted = [...chats].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  function persist(chat: Chat): Promise<boolean> {
    return mutate((current) =>
      current.some((c) => c.id === chat.id) ? current.map((c) => (c.id === chat.id ? chat : c)) : [chat, ...current],
    );
  }

  function openChat(chat: Chat) {
    push(<ChatView chat={chat} persist={persist} onNewChat={readOnly ? undefined : replaceWithNewChat} />);
  }

  async function startChat(seed?: ChatSeed, replaceCurrent = false) {
    const chat = createChat({ id: crypto.randomUUID(), now: new Date().toISOString() }, { seed });
    if (!(await persist(chat))) return;
    if (replaceCurrent) pop();
    openChat(chat);
  }

  function replaceWithNewChat() {
    void startChat(undefined, true);
  }

  useEffect(() => {
    if (!props.seed || isLoading || seedHandled.current) return;
    seedHandled.current = true;
    void startChat(props.seed);
  }, [isLoading]);

  async function remove(chat: Chat) {
    const confirmed = await confirmAlert({
      title: `Delete "${chat.title}"?`,
      message: "This chat and its messages will be removed.",
      primaryAction: { title: "Delete Chat", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) await mutate((current) => current.filter((c) => c.id !== chat.id));
  }

  const newChatAction = <Action title="New Chat" icon={Icon.Plus} onAction={() => startChat()} />;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search chats">
      {!readOnly && (
        <List.Item
          id="new-chat"
          title="New Chat"
          icon={Icon.Plus}
          actions={<ActionPanel>{newChatAction}</ActionPanel>}
        />
      )}
      {notice && <List.Item icon={Icon.Info} title={notice} actions={<ActionPanel>{newChatAction}</ActionPanel>} />}
      {sorted.map((chat) => (
        <List.Item
          key={chat.id}
          title={chat.title}
          subtitle={`${chat.messages.length} messages`}
          accessories={[{ date: new Date(chat.updatedAt) }]}
          actions={
            <ActionPanel>
              <Action title="Open Chat" icon={Icon.Message} onAction={() => openChat(chat)} />
              {!readOnly && newChatAction}
              {!readOnly && (
                <Action.Push
                  title="Rename Chat"
                  icon={Icon.Pencil}
                  target={
                    <RenameChatForm
                      title={chat.title}
                      onSave={(title) =>
                        mutate((current) =>
                          current.map((c) => (c.id === chat.id ? renameChat(c, title, new Date().toISOString()) : c)),
                        )
                      }
                    />
                  }
                />
              )}
              {!readOnly && (
                <Action.Push
                  title="Edit Instructions"
                  icon={Icon.Text}
                  target={
                    <ChatSettingsForm
                      instructions={chat.instructions}
                      onSave={(instructions) =>
                        mutate((current) =>
                          current.map((c) =>
                            c.id === chat.id ? { ...c, instructions, updatedAt: new Date().toISOString() } : c,
                          ),
                        )
                      }
                    />
                  }
                />
              )}
              {!readOnly && (
                <Action
                  title="Delete Chat"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => remove(chat)}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
