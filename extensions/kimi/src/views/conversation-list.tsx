import { List } from "@raycast/api";
import type { ReactElement } from "react";
import type { Conversation } from "../type";

export const ConversationListView = (props: {
  title: string;
  conversations: Conversation[];
  selectedConversation: string | null;
  actionPanel: (conversation: Conversation) => ReactElement;
}) => {
  const { title, conversations, selectedConversation, actionPanel } = props;

  return (
    <List.Section title={title} subtitle={conversations.length.toLocaleString()}>
      {conversations.map((conversation) => (
        <List.Item
          id={conversation.id}
          key={conversation.id}
          title={
            conversation.chats.length > 0
              ? conversation.chats[conversation.chats.length - 1].question
              : "Empty conversation"
          }
          accessories={[
            { text: conversation.chats.length > 0 ? conversation.chats[conversation.chats.length - 1].answer : "" },
            { tag: conversation.model.name },
            { text: new Date(conversation.created_at ?? 0).toLocaleDateString() },
          ]}
          // @ts-expect-error - Raycast bundles its own @types/react, causing ReactElement version mismatch
          actions={conversation && selectedConversation === conversation.id ? actionPanel(conversation) : undefined}
        />
      ))}
    </List.Section>
  );
};
