import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard, List, useNavigation } from "@raycast/api";
import { useConversations } from "./hooks/useConversations";
import { formatFullTime, formatRelativeTime } from "./utils/date/time";
import AskQuestion from "./ask-question";
import { Conversation } from "./types/conversation";
import ConversationForm from "./views/conversations/conversation-form";
import { useState } from "react";

export default function Conversations() {
  const {
    data: conversations,
    isLoading: isLoadingConversations,
    remove: removeConversation,
    refresh,
  } = useConversations();
  const { push } = useNavigation();
  const [updateKey, setUpdateKey] = useState(0);

  const markdown = (conversation: Conversation) => {
    const questionsList =
      conversation.questions && conversation.questions.length > 0
        ? conversation.questions.map((q) => `- ${q.prompt}`).join("\n")
        : "*No messages yet...*";

    return `
### Recent Messages

${questionsList}
    `.trim();
  };

  const handleConfirmDelete = (conversation: Conversation) => {
    return confirmAlert({
      title: "Delete this conversation?",
      message: "You will not be able to recover it",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
        onAction: () => removeConversation(conversation),
      },
      dismissAction: {
        title: "Cancel",
      },
    });
  };

  const renderListActions = () => (
    <ActionPanel>
      <Action
        title="New Chat"
        icon={Icon.Plus}
        shortcut={Keyboard.Shortcut.Common.New}
        onAction={() =>
          push(<AskQuestion />, async () => {
            await refresh();
            setUpdateKey((prev) => prev + 1);
          })
        }
      />
    </ActionPanel>
  );

  const renderListItemActions = (conversation: Conversation) => (
    <ActionPanel>
      <Action
        title="Open Conversation"
        icon={Icon.ArrowRight}
        onAction={() =>
          push(<AskQuestion conversationId={conversation.id} />, async () => {
            await refresh();
            setUpdateKey((prev) => prev + 1);
          })
        }
      />
      <Action
        title="Update Title"
        icon={Icon.Pencil}
        shortcut={Keyboard.Shortcut.Common.Edit}
        onAction={() =>
          push(<ConversationForm conversationId={conversation.id} />, async () => {
            await refresh();
            setUpdateKey((prev) => prev + 1);
          })
        }
      />
      <Action
        title="Delete Conversation"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={Keyboard.Shortcut.Common.Remove}
        onAction={() => handleConfirmDelete(conversation)}
      />
    </ActionPanel>
  );

  return (
    <List
      isShowingDetail={conversations.length !== 0}
      isLoading={isLoadingConversations}
      key={updateKey}
      actions={renderListActions()}
      searchBarPlaceholder="Search history..."
    >
      {conversations.length === 0 ? (
        <List.EmptyView title="No Conversations" description="Your chat history will appear here." icon={Icon.Bubble} />
      ) : (
        conversations.map((conversation) => (
          <List.Item
            key={conversation.id}
            id={conversation.id}
            title={conversation.title}
            accessories={[{ text: formatRelativeTime(conversation.createdAt) }]}
            detail={
              <List.Item.Detail
                isLoading={isLoadingConversations}
                markdown={markdown(conversation)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Title" text={conversation.title} />
                    <List.Item.Detail.Metadata.Label title="Created" text={formatFullTime(conversation.createdAt)} />
                    <List.Item.Detail.Metadata.Label
                      title="Messages"
                      text={conversation.questions?.length.toString() ?? "0"}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={renderListItemActions(conversation)}
          />
        ))
      )}
    </List>
  );
}
