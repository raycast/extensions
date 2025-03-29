import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useConversations } from "./hooks/use-conversations";
import { Conversation } from "./components/conversation";

export default function Command() {
  const { value: conversations, setValue: setConversations, isLoading } = useConversations();
  const { push } = useNavigation();

  return (
    <List searchBarPlaceholder="Search a conversation" isLoading={isLoading}>
      {conversations?.map((conversation) => (
        <List.Item
          key={conversation.id}
          title={conversation.title}
          subtitle={new Date(conversation.date).toDateString()}
          actions={
            <ActionPanel>
              <Action
                title="Continue Conversation"
                icon={Icon.ArrowRightCircle}
                onAction={() => push(<Conversation conversation={conversation} />)}
              />
              <Action
                title="Delete Conversation"
                style={Action.Style.Destructive}
                icon={Icon.Trash}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => setConversations(conversations.filter((c) => c.id !== conversation.id))}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
