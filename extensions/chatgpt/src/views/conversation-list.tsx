import { List } from "@raycast/api";
import { Conversation } from "../type";

export const ConversationListView = (props: {
  title: string;
  conversations: Conversation[];
  selectedConversation: string | null;
  actionPanel: (conversation: Conversation) => JSX.Element;
}) => {
  const { title, conversations, selectedConversation, actionPanel } = props;

  return (
    <List.Section title={title} subtitle={conversations.length.toLocaleString()}>
      {conversations.map((conversation) => (
        <List.Item
          id={conversation.id}
          key={conversation.id}
          title={conversation.chats[conversation.chats.length - 1].question}
          accessories={[
            { text: conversation.chats[conversation.chats.length - 1].answer },
            { tag: conversation.model.name },
            { text: new Date(conversation.created_at ?? 0).toLocaleDateString() },
          ]}
          actions={conversation && selectedConversation === conversation.id ? actionPanel(conversation) : undefined}
        />
      ))}
    </List.Section>
  );
};
