import {
  Action,
  ActionPanel,
  Clipboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import {
  getPinnedMessages,
  unpinMessage,
  generateMessageId,
  ParsedMessage,
} from "./utils/claudeMessages";

export default function PinnedMessages() {
  const [messages, setMessages] = useState<ParsedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadMessages = useCallback(async () => {
    setIsLoading(true);
    try {
      const pinnedMessages = await getPinnedMessages();
      // Sort by pinned date (most recent first)
      const sortedMessages = pinnedMessages.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      );
      setMessages(sortedMessages);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error loading pinned messages",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  async function copyContent(message: ParsedMessage) {
    try {
      await Clipboard.copy(message.content);
      showToast({
        style: Toast.Style.Success,
        title: "Content copied",
        message: "Message content copied to clipboard",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Copy failed",
        message: String(error),
      });
    }
  }

  async function handleUnpin(message: ParsedMessage) {
    try {
      const messageId = generateMessageId(message);
      await unpinMessage(messageId);
      showToast({
        style: Toast.Style.Success,
        title: "Message unpinned",
        message: "Message removed from pinned list",
      });
      // Reload messages
      loadMessages();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Unpin failed",
        message: String(error),
      });
    }
  }

  function getMessageTypeIcon(role: "user" | "assistant") {
    return role === "user" ? "💬" : "🤖";
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search your pinned messages..."
      actions={
        <ActionPanel>
          <Action
            title="Refresh Messages"
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={loadMessages}
          />
        </ActionPanel>
      }
    >
      {messages.length === 0 && !isLoading && (
        <List.EmptyView
          title="No pinned messages"
          description="Pin messages from your conversation history to see them here"
          actions={
            <ActionPanel>
              <Action
                title="Refresh Messages"
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={loadMessages}
              />
            </ActionPanel>
          }
        />
      )}
      {messages.map((message) => (
        <List.Item
          key={message.id}
          title={message.preview}
          accessories={[
            { text: "📌" },
            { text: message.timestamp.toLocaleTimeString() },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Copy Message"
                onAction={() => copyContent(message)}
              />
              <Action
                title="Unpin Message"
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                onAction={() => handleUnpin(message)}
              />
              <Action
                title="Refresh Messages"
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={loadMessages}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
