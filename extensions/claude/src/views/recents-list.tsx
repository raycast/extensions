import { List } from "@raycast/api";
import type { ReactNode } from "react";
import type { Conversation } from "../type";

/** House style bans "1 messages", and the "item(s)" form is also out — a real singular. */
function messageCountLabel(count: number): string {
  return `${count} ${count === 1 ? "message" : "messages"}`;
}

export const RecentsListView = (props: {
  title: string;
  conversations: Conversation[];
  selectedConversation: string | null;
  actionPanel: (conversation: Conversation) => ReactNode;
}) => {
  const { title, conversations, selectedConversation, actionPanel } = props;

  return (
    <List.Section title={title} subtitle={conversations.length.toLocaleString()}>
      {conversations.map((conversation) => {
        const chats = conversation.chats ?? [];
        const messageCount = chats.length;
        // Chats are already chronological by the time they reach this view (the store's
        // `transformOnRead` — see `useRecents.tsx`), so the last element is the newest turn.
        const latestChat = chats.at(-1);

        return (
          <List.Item
            id={conversation.id}
            key={conversation.id}
            title={conversation.title || latestChat?.question || "New Conversation"}
            accessories={[
              { text: messageCountLabel(messageCount) },
              { date: new Date(conversation.updated_at || conversation.created_at) },
            ]}
            actions={conversation && selectedConversation === conversation.id ? actionPanel(conversation) : undefined}
          />
        );
      })}
    </List.Section>
  );
};
