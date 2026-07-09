import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import * as storage from "./lib/storage";
import { Chat } from "./lib/types";
import { answerText, splitIntoTurns } from "./lib/transcript";
import { ChatView } from "./views/ChatView";

// The last exchange can have an empty answer (a failed or interrupted
// request), so scan backward for the last turn that actually has one.
function lastNonEmptyAnswer(c: Chat): string {
  const turns = splitIntoTurns(c);
  for (let i = turns.length - 1; i >= 0; i--) {
    const text = answerText(turns[i]);
    if (text) return text;
  }
  return "";
}

export default function ChatHistory() {
  const [chats, setChats] = useState<Chat[] | null>(null);

  const refresh = useCallback(async () => {
    setChats(await storage.listChats());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <List isLoading={chats === null} searchBarPlaceholder="Search chats…">
      <List.EmptyView
        icon={Icon.Clock}
        title="No chats yet"
        description="Start a conversation with the Chat command."
      />
      {(chats ?? []).map((c) => (
        <List.Item
          key={c.id}
          title={c.title}
          subtitle={c.model}
          accessories={[{ date: new Date(c.updatedAt) }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Continue Chat"
                icon={Icon.Message}
                target={<ChatView chatId={c.id} />}
              />
              <Action.CopyToClipboard
                title="Copy Last Answer"
                content={lastNonEmptyAnswer(c)}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action
                title="Delete Chat"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={async () => {
                  await storage.deleteChat(c.id);
                  await refresh();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
