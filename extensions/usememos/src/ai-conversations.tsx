import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  Conversation,
  getConversations,
  deleteConversation,
} from "./storage/conversations";
import QuickAI from "./quick-ai";

export default function AIConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const convos = await getConversations();
      setConversations(convos);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load conversations",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const handleDelete = async (conversation: Conversation) => {
    const confirmed = await confirmAlert({
      title: "Delete Conversation",
      message: "Are you sure you want to delete this conversation?",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await deleteConversation(conversation.id);
        showToast({
          style: Toast.Style.Success,
          title: "Conversation deleted",
        });
        loadConversations();
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete",
          message: String(error),
        });
      }
    }
  };

  const getPreview = (conversation: Conversation): string => {
    const lastMessage = [...conversation.messages]
      .reverse()
      .find((m) => m.role === "assistant" && m.content);
    return lastMessage?.content.slice(0, 60) || "No messages yet";
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search conversations...">
      {conversations.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Message}
          title="No conversations yet"
          description="Start chatting with the AI Agent!"
          actions={
            <ActionPanel>
              <Action.Push
                title="New Conversation"
                icon={Icon.Plus}
                target={<QuickAI />}
              />
            </ActionPanel>
          }
        />
      ) : (
        conversations.map((conversation) => (
          <List.Item
            key={conversation.id}
            icon={Icon.Message}
            title={conversation.title}
            subtitle={getPreview(conversation)}
            accessories={[
              {
                date: new Date(conversation.updatedAt),
                tooltip: `Updated: ${new Date(conversation.updatedAt).toLocaleString()}`,
              },
              {
                text: `${conversation.messages.filter((m) => m.role === "user").length} messages`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Continue Conversation"
                  icon={Icon.Message}
                  onAction={() =>
                    push(<QuickAI existingConversation={conversation} />)
                  }
                />
                <Action.Push
                  title="New Conversation"
                  icon={Icon.Plus}
                  target={<QuickAI />}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
                <Action
                  title="Delete"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  onAction={() => handleDelete(conversation)}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={loadConversations}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
