import { Action, ActionPanel, Icon, List, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useState, useEffect, useRef, useCallback } from "react";
import { getBeeperClient, checkBeeperConnection, createBeeperOAuth } from "./services/beeper-client";
import { MOCK_MESSAGES } from "./utils/mock-data";
import { openChat } from "./services/openChat";
import { getServiceIcon, getServiceDisplayName } from "./utils/service-icons";
import { parseService, BeeperService } from "./utils/types";
import formatTimeDistance from "fromnow";

interface MessageSearchResult {
  id: string;
  text: string;
  senderName: string;
  chatId: string;
  accountId: string;
  timestamp: string;
  service: BeeperService;
  isSender: boolean;
  isUnread?: boolean;
}

type SenderFilter = "all" | "me" | "others";

/**
 * Truncate text to a maximum length with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Clean up message text for display
 * Removes excessive whitespace and newlines
 */
function cleanMessageText(text: string | undefined): string {
  if (!text) return "[No text content]";
  return text.replace(/\s+/g, " ").trim();
}

function SearchMessagesCommand() {
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [senderFilter, setSenderFilter] = useState<SenderFilter>("all");

  const [messages, setMessages] = useState<MessageSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(false);

  // Track mount state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Perform search - only called when we have a valid query
  const performSearch = useCallback(async () => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const { useMockData } = getPreferenceValues<Preferences>();
      if (useMockData) {
        // Filter mock messages by search query for screenshot consistency
        const query = debouncedSearch.trim().toLowerCase();
        const filtered = query
          ? MOCK_MESSAGES.filter(
              (m) => m.text.toLowerCase().includes(query) || m.senderName.toLowerCase().includes(query),
            )
          : MOCK_MESSAGES;
        if (isMountedRef.current) {
          setMessages(filtered);
        }
        return;
      }

      const connectionStatus = await checkBeeperConnection();
      if (!connectionStatus.connected) {
        throw new Error(connectionStatus.error || "Cannot connect to Beeper Desktop");
      }

      const client = await getBeeperClient();

      // Build search params - only use API-supported parameters
      const searchParams: {
        query: string;
        sender?: "me" | "others";
        includeMuted: boolean;
      } = {
        query: debouncedSearch.trim(),
        includeMuted: true,
      };

      if (senderFilter !== "all") {
        searchParams.sender = senderFilter;
      }

      const searchCursor = await client.messages.search(searchParams);

      // Collect results
      const messagesFromApi: Array<{
        id: string;
        text?: string;
        senderName?: string;
        senderID: string;
        chatID: string;
        accountID: string;
        timestamp: string;
        isSender?: boolean;
        isUnread?: boolean;
      }> = [];

      for await (const message of searchCursor) {
        messagesFromApi.push(message);
        if (messagesFromApi.length >= 50) break;
      }

      // Transform results
      const transformedMessages: MessageSearchResult[] = messagesFromApi.map((msg) => ({
        id: msg.id,
        text: cleanMessageText(msg.text),
        senderName: msg.senderName || msg.senderID?.split(":")[0]?.replace("@", "") || "Unknown",
        chatId: msg.chatID,
        accountId: msg.accountID,
        timestamp: msg.timestamp,
        service: parseService(msg.accountID),
        isSender: msg.isSender || false,
        isUnread: msg.isUnread,
      }));

      // Only update state if still mounted
      if (isMountedRef.current) {
        setMessages(transformedMessages);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      const message = err instanceof Error ? err.message : "Search failed";
      if (isMountedRef.current) {
        setError(message);
        showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message,
        });
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [debouncedSearch, senderFilter]);

  // Trigger search on filter/query changes - only when we have a valid query
  useEffect(() => {
    // Don't search if query is empty or too short
    if (!debouncedSearch.trim() || debouncedSearch.trim().length < 2) {
      return;
    }
    performSearch();
  }, [debouncedSearch, senderFilter, performSearch]);

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search message content..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by sender"
          value={senderFilter}
          onChange={(value) => setSenderFilter(value as SenderFilter)}
        >
          <List.Dropdown.Item title="All Messages" value="all" icon={Icon.Message} />
          <List.Dropdown.Item title="Sent by Me" value="me" icon={Icon.Person} />
          <List.Dropdown.Item title="Sent by Others" value="others" icon={Icon.TwoPeople} />
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Cannot connect to Beeper"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={performSearch} />
            </ActionPanel>
          }
        />
      ) : !debouncedSearch.trim() || debouncedSearch.trim().length < 2 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search message content"
          description="Type at least 2 characters to search within all your Beeper messages"
        />
      ) : messages.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No messages found"
          description={`No results for "${debouncedSearch}"`}
        />
      ) : (
        messages.map((msg) => <MessageListItem key={msg.id} message={msg} onRefresh={performSearch} />)
      )}
    </List>
  );
}

export default withAccessToken(createBeeperOAuth())(SearchMessagesCommand);

interface MessageListItemProps {
  message: MessageSearchResult;
  onRefresh?: () => void;
}

function MessageListItem({ message, onRefresh }: MessageListItemProps) {
  const serviceInfo = getServiceIcon(message.service);
  const timeAgo = formatTimeDistance(new Date(message.timestamp).getTime(), { suffix: true, max: 1 });

  async function handleOpenChat() {
    const result = await openChat({ chatId: message.chatId });

    if (result.success) {
      showToast({
        style: Toast.Style.Success,
        title: "Opened chat",
        message: `Chat opened in Beeper`,
      });
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to open chat",
        message: result.error,
      });
    }
  }

  const accessories: List.Item.Accessory[] = [{ text: timeAgo, tooltip: new Date(message.timestamp).toLocaleString() }];

  if (message.isUnread) {
    accessories.unshift({ icon: Icon.Circle, tooltip: "Unread" });
  }

  if (message.isSender) {
    accessories.unshift({ tag: "You", tooltip: "Sent by you" });
  }

  const senderDisplay = message.isSender ? "You" : message.senderName;
  const serviceName = getServiceDisplayName(message.service);

  return (
    <List.Item
      id={message.id}
      title={truncateText(message.text, 80)}
      subtitle={`${senderDisplay} · ${serviceName}`}
      icon={{ source: serviceInfo.icon as Icon, tintColor: serviceInfo.tintColor }}
      accessories={accessories}
      keywords={[message.senderName, message.text, serviceName]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Open Chat in Beeper" icon={Icon.Message} onAction={handleOpenChat} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard content={message.text} title="Copy Message Text" />
            <Action.CopyToClipboard content={message.chatId} title="Copy Chat ID" />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onRefresh}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
