import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  ConversationSummary,
  deleteAllConversations,
  deleteConversation,
  listConversations,
} from "../lib/conversations";
import { formatUsd, modelLabel } from "../lib/models";
import { Chat } from "./Chat";

function section(updatedAt: number): string {
  const day = 24 * 60 * 60 * 1000;
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  if (updatedAt >= startOfToday) return "Today";
  if (updatedAt >= startOfToday - day) return "Yesterday";
  if (updatedAt >= startOfToday - 6 * day) return "This Week";
  return "Older";
}

/** `nested`: pushed from a chat, so it may set its own navigation title. */
export function ConversationList(props: { nested?: boolean }) {
  const { data = [], isLoading, revalidate } = usePromise(listConversations);

  const groups = new Map<string, ConversationSummary[]>();
  for (const item of data) {
    const key = section(item.updatedAt);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  async function remove(item: ConversationSummary) {
    const ok = await confirmAlert({
      title: "Delete Conversation?",
      message: item.title,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    await deleteConversation(item.id);
    revalidate();
  }

  async function removeAll() {
    const ok = await confirmAlert({
      title: "Delete All Conversations?",
      message: `${data.length} conversations and their attachments will be permanently deleted.`,
      primaryAction: { title: "Delete All", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    await deleteAllConversations();
    revalidate();
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search conversations…"
      navigationTitle={props.nested ? "Conversations" : undefined}
    >
      <List.EmptyView
        icon={Icon.SpeechBubble}
        title="No conversations yet"
        description="Conversations you start with Ask Claude show up here."
      />
      {[...groups.entries()].map(([title, items]) => (
        <List.Section key={title} title={title}>
          {items.map((item) => (
            <List.Item
              key={item.id}
              icon={Icon.SpeechBubble}
              title={item.title}
              subtitle={item.preview}
              keywords={item.preview.split(/\s+/).slice(0, 30)}
              accessories={[
                { text: item.turns === 1 ? "1 message" : `${item.turns} messages` },
                { tag: modelLabel(item.model) },
                { text: formatUsd(item.cost), tooltip: "Total cost of the conversation" },
                { date: new Date(item.updatedAt) },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Open Conversation"
                    icon={Icon.Bubble}
                    target={<Chat conversationId={item.id} navigationTitle="Conversation" />}
                    onPop={revalidate}
                  />
                  <Action
                    title="Delete Conversation"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => void remove(item)}
                  />
                  <Action
                    title="Delete All Conversations"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.RemoveAll}
                    onAction={() => void removeAll()}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
