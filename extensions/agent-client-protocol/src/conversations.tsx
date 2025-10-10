/**
 * Conversations Command - Browse and manage conversation history
 *
 * Allows users to view past conversations, continue conversations,
 * and manage conversation history with agents.
 */

import {
  Action,
  ActionPanel,
  List,
  showToast,
  Toast,
  confirmAlert,
  Alert
} from "@raycast/api";
import { useState, useEffect } from "react";
import { StorageService } from "@/services/storageService";
import { ErrorHandler } from "@/utils/errors";
import { createLogger } from "@/utils/logging";
import type { ConversationSession } from "@/types/extension";

const logger = createLogger("ConversationsCommand");

export default function ConversationsCommand() {
  const [conversations, setConversations] = useState<ConversationSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const storageService = new StorageService();

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    try {
      setIsLoading(true);
      await storageService.initialize();
      const conversationList = await storageService.getConversations();

      // Sort by last activity (most recent first)
      conversationList.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());

      setConversations(conversationList);
      logger.info("Conversations loaded", { count: conversationList.length });
    } catch (error) {
      await ErrorHandler.handleError(error, "Loading conversations");
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteConversation(sessionId: string) {
    const confirmed = await confirmAlert({
      title: "Delete Conversation",
      message: "Are you sure you want to delete this conversation? This action cannot be undone.",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await storageService.deleteConversation(sessionId);
        await loadConversations(); // Refresh the list
        await ErrorHandler.showSuccess("Conversation deleted");
      } catch (error) {
        await ErrorHandler.handleError(error, "Deleting conversation");
      }
    }
  }

  async function archiveConversation(sessionId: string) {
    try {
      await storageService.archiveConversation(sessionId);
      await loadConversations(); // Refresh the list
      await ErrorHandler.showSuccess("Conversation archived");
    } catch (error) {
      await ErrorHandler.handleError(error, "Archiving conversation");
    }
  }

  function getConversationTitle(conversation: ConversationSession): string {
    // Use the first user message as title, truncated
    const firstUserMessage = conversation.messages.find(m => m.role === "user");
    if (firstUserMessage?.content) {
      return firstUserMessage.content.length > 50
        ? firstUserMessage.content.substring(0, 50) + "..."
        : firstUserMessage.content;
    }
    return `Conversation ${conversation.sessionId.substring(0, 8)}`;
  }

  function getConversationSubtitle(conversation: ConversationSession): string {
    const messageCount = conversation.messages.length;
    const lastActivity = conversation.lastActivity.toLocaleDateString();
    return `${messageCount} messages • ${lastActivity}`;
  }

  function getStatusIcon(status: ConversationSession["status"]): string {
    switch (status) {
      case "active":
        return "🟢";
      case "completed":
        return "✅";
      case "archived":
        return "📦";
      case "error":
        return "❌";
      default:
        return "⚪";
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search conversations...">
      {conversations.length === 0 ? (
        <List.EmptyView
          icon="💬"
          title="No Conversations Yet"
          description="Start your first conversation with an AI agent using the 'Ask AI Agent' command."
        />
      ) : (
        conversations.map((conversation) => (
          <List.Item
            key={conversation.sessionId}
            icon={getStatusIcon(conversation.status)}
            title={getConversationTitle(conversation)}
            subtitle={getConversationSubtitle(conversation)}
            accessories={[
              { text: conversation.agentConnectionId },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Continue Conversation"
                  icon="💬"
                  onAction={() => {
                    // TODO: Navigate to chat with this session
                    showToast({
                      style: Toast.Style.Success,
                      title: "Feature Coming Soon",
                      message: "Continue conversation feature is in development"
                    });
                  }}
                />
                <Action
                  title="Archive Conversation"
                  icon="📦"
                  onAction={() => archiveConversation(conversation.sessionId)}
                />
                <Action
                  title="Delete Conversation"
                  icon="🗑"
                  style={Action.Style.Destructive}
                  onAction={() => deleteConversation(conversation.sessionId)}
                />
                <Action
                  title="Refresh"
                  icon="🔄"
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