import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Icon,
  List,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalSearch } from "../../utils/ai-search";
import { getReceivedMessages, ParsedMessage } from "../../utils/claude-message";
import {
  formatSectionTitle,
  groupMessagesByDate,
} from "../../utils/date-grouping";
import CreateSnippet from "../create-snippet/list";
import MessageDetail from "./detail";

export default function ReceivedMessages() {
  const [messages, setMessages] = useState<ParsedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const loadingRef = useRef(false);

  const loadMessages = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setIsLoading(true);
    try {
      const receivedMessages = await getReceivedMessages();
      // Sort by timestamp (newest first)
      const sortedMessages = receivedMessages.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      );
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

  // Filter messages with normal search
  const displayMessages = useMemo(() => {
    if (searchText.trim()) {
      return normalSearch(messages, searchText);
    }
    return messages;
  }, [messages, searchText]);

  // Group messages by date for section display
  const messageGroups = useMemo(() => {
    return groupMessagesByDate(displayMessages);
  }, [displayMessages]);

  async function copyContent(message: ParsedMessage, closeWindow = false) {
    try {
      await Clipboard.copy(message.content);
      if (closeWindow) {
        await closeMainWindow();
        await showHUD("Copied to Clipboard");
      } else {
        await showToast({
          style: Toast.Style.Success,
          title: "Content copied",
          message: "Message content copied to clipboard",
        });
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Copy failed",
        message: String(error),
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Browse received messages..."
      onSearchTextChange={setSearchText}
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
          description="No received messages found in your Claude history"
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
      {messageGroups.map((group) => (
        <List.Section
          key={group.category}
          title={formatSectionTitle(group.category, group.messages.length)}
        >
          {group.messages.map((message) => (
            <List.Item
              key={message.id}
              title={message.preview}
              accessories={[
                {
                  text: message.timestamp.toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Message"
                    icon={Icon.Eye}
                    target={<MessageDetail message={message} />}
                  />
                  <Action
                    title="Copy to Clipboard"
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd"], key: "enter" }}
                    onAction={() => copyContent(message, true)}
                  />
                  <Action.Push
                    title="Create Snippet from Message"
                    icon={Icon.Document}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                    target={<CreateSnippet content={message.content} />}
                  />
                  <Action
                    title="Refresh Messages"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={loadMessages}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
