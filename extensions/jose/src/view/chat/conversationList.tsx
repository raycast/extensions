import { List } from "@raycast/api";
import { ConversationType } from "../../type/conversation";

export const ConversationListView = (props: {
  title: string;
  conversations: ConversationType[];
  selectedConversation: string | null;
  actionPanel: (conversation: ConversationType) => JSX.Element;
}) => {
  const { title, conversations, selectedConversation, actionPanel } = props;

  return (
    <List.Section title={title} subtitle={conversations.length.toLocaleString()}>
      {conversations.map((conversation) => (
        <List.Item
          id={conversation.conversationId}
          key={conversation.conversationId}
          title={conversation.chats[conversation.chats.length - 1].question.text}
          icon={conversation.assistant.avatar}
          accessories={[
            { text: conversation.chats[conversation.chats.length - 1].result?.text },
            { tag: conversation.assistant.title },
            { text: new Date(conversation.createdAt ?? 0).toLocaleDateString() },
          ]}
          actions={
            conversation && selectedConversation === conversation.conversationId ? actionPanel(conversation) : undefined
          }
        />
      ))}
    </List.Section>
  );
};
