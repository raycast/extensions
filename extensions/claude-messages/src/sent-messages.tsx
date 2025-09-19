import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Clipboard,
} from "@raycast/api";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  getSentMessages,
  ParsedMessage,
  formatMessageForDisplay,
  pinMessage,
  unpinMessage,
  generateMessageId,
  isPinned,
} from "./utils/claudeMessages";

export default function SentMessages() {
  const [messages, setMessages] = useState<ParsedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const loadingRef = useRef(false);

  const loadMessages = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setIsLoading(true);
    try {
      const sentMessages = await getSentMessages();
      // Check pinned status for each message
      const messagesWithPinnedStatus = await Promise.all(
        sentMessages.map(async (msg) => {
          const messageId = generateMessageId(msg);
          const pinned = await isPinned(messageId);
          return { ...msg, isPinned: pinned };
        })
      );
      // Sort so pinned messages appear first
      const sortedMessages = messagesWithPinnedStatus.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.timestamp.getTime() - a.timestamp.getTime();
      });
      setMessages(sortedMessages);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error loading messages",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadMessages();
  }, []);

  async function copyMessage(message: ParsedMessage) {
    try {
      const fullMessage = formatMessageForDisplay(message);
      await Clipboard.copy(fullMessage);
      showToast({
        style: Toast.Style.Success,
        title: "Copied to clipboard",
        message: "Message copied successfully",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Copy failed",
        message: String(error),
      });
    }
  }

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

  async function handlePin(message: ParsedMessage) {
    try {
      await pinMessage(message);
      showToast({
        style: Toast.Style.Success,
        title: "Message pinned",
        message: "Message added to pinned list",
      });
      // Reload messages to update pinned status
      loadMessages();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Pin failed",
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
      // Reload messages to update pinned status
      loadMessages();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Unpin failed",
        message: String(error),
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search your messages to Claude..."
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
          title="No messages found"
          description="No sent messages found in your Claude history"
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
      {messages.filter((message) => message.isPinned).length > 0 && (
        <List.Section title="Pinned">
          {messages
            .filter((message) => message.isPinned)
            .map((message) => (
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
        </List.Section>
      )}
      <List.Section
        title={
          messages.filter((message) => message.isPinned).length > 0
            ? "Recent Messages"
            : ""
        }
      >
        {messages
          .filter((message) => !message.isPinned)
          .map((message) => (
            <List.Item
              key={message.id}
              title={message.preview}
              accessories={[{ text: message.timestamp.toLocaleTimeString() }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Copy Message"
                    onAction={() => copyContent(message)}
                  />
                  <Action
                    title="Pin Message"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                    onAction={() => handlePin(message)}
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
      </List.Section>
    </List>
  );
}
