/**
 * "Conversations" Command
 *
 * Enables users to view and manage their conversations
 * with various questions and models.
 *
 * Key Features:
 * - CRUD
 * - List questions in conversation and pop to `AskQuestion` component
 */

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
        : "*No questions yet...*";

    // Important: ensure template string is un-nested to avoid indentation errors
    return `
### Recent Questions

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
        title="New Conversation"
        icon={Icon.PlusCircle}
        shortcut={Keyboard.Shortcut.Common.New}
        onAction={() =>
          push(<AskQuestion />, async () => {
            await refresh(); // Refresh question-enriched conversations
            setUpdateKey((prev) => prev + 1); // Suposedly this force re-renders the List (can't tell tbh)
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
        title="New Conversation"
        icon={Icon.PlusCircle}
        shortcut={Keyboard.Shortcut.Common.New}
        onAction={() =>
          push(<AskQuestion />, async () => {
            await refresh();
            setUpdateKey((prev) => prev + 1);
          })
        }
      />
      <Action
        title="Update Conversation"
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
      searchBarPlaceholder="Search conversations..."
    >
      {conversations.length === 0 ? (
        <List.EmptyView title="No conversations yet" description="Start making conversations with your AI wizard 🧙‍♂️" />
      ) : (
        conversations.map((conversation) => (
          <List.Item
            key={conversation.id}
            id={conversation.id}
            title={conversation.title}
            accessories={[{ text: formatRelativeTime(conversation.createdAt) }]} // TODO: maybe remove? (I kinda like though tbh)
            detail={
              <List.Item.Detail
                isLoading={isLoadingConversations}
                markdown={markdown(conversation)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Conversation Title" text={conversation.title} />
                    <List.Item.Detail.Metadata.Label
                      title="Date Created"
                      text={formatFullTime(conversation.createdAt)}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Question Count"
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
