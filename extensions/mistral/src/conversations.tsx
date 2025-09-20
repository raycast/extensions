import { Action, ActionPanel, Alert, confirmAlert, Icon, List, useNavigation } from "@raycast/api";
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
                onAction={async () => {
                  if (
                    await confirmAlert({
                      title: "Delete Conversation",
                      message: "Are you sure you want to delete this conversation?",
                      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                    })
                  ) {
                    setConversations(conversations.filter((c) => c.id !== conversation.id));
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
