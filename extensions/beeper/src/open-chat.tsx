import { Action, ActionPanel, Icon, List, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useCachedPromise, withAccessToken } from "@raycast/utils";
import { useState } from "react";
import { getBeeperClient, checkBeeperConnection, createBeeperOAuth } from "./services/beeper-client";
import { MOCK_CHATS } from "./utils/mock-data";
import { openChat } from "./services/openChat";
import { getServiceIcon, getServiceDisplayName } from "./utils/service-icons";
import { parseService, BeeperService } from "./utils/types";
import formatTimeDistance from "fromnow";
import { resetAuth } from "./services/beeper-client";

interface BeeperChatItem {
  id: string;
  name: string;
  type: "single" | "group" | "space";
  service: BeeperService;
  networkRaw: string; // Raw network name from API for display
  accountId: string;
  lastMessageAt?: string;
  unreadCount?: number;
  isMuted?: boolean;
  isArchived?: boolean;
}

/**
 * Get the best display name for a chat
 * Falls back to participant name or cleaned matrix ID if title is a matrix user ID
 */
function getBestChatName(chat: {
  title: string;
  type: string;
  participants?: { items: Array<{ fullName?: string; id: string }> };
}): string {
  const title = chat.title;

  // Check if title looks like a Matrix ID (contains @ and :)
  if (title && title.includes("@") && title.includes(":")) {
    // For single chats, try participant's fullName
    if (chat.type === "single" && chat.participants?.items?.[0]?.fullName) {
      return chat.participants.items[0].fullName;
    }
    // Otherwise extract username from matrix ID: @username:domain -> username
    const match = title.match(/@([^:]+):/);
    if (match) {
      return match[1];
    }
  }

  return title || "Unknown Chat";
}

function OpenChatCommand() {
  const [serviceFilter, setServiceFilter] = useState<string>("all");

  const {
    data: chats,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    async () => {
      const { useMockData } = getPreferenceValues<Preferences>();
      if (useMockData) {
        return MOCK_CHATS;
      }

      // First check connection
      const connectionStatus = await checkBeeperConnection();
      if (!connectionStatus.connected) {
        throw new Error(connectionStatus.error || "Cannot connect to Beeper Desktop");
      }

      const client = await getBeeperClient();
      const searchCursor = await client.chats.search({
        limit: 100,
        includeMuted: true,
      });

      // Collect results from cursor
      const chatsFromApi: Array<{
        id: string;
        title: string;
        type: "single" | "group";
        network: string;
        accountID: string;
        lastActivity?: string;
        unreadCount: number;
        isMuted?: boolean;
        isArchived?: boolean;
        participants?: { items: Array<{ fullName?: string; id: string }> };
      }> = [];
      for await (const chat of searchCursor) {
        chatsFromApi.push(chat);
        if (chatsFromApi.length >= 100) break;
      }

      // Transform to our chat format
      const transformedChats: BeeperChatItem[] = chatsFromApi.map((chat) => ({
        id: chat.id || "",
        name: getBestChatName(chat),
        type: chat.type || "single",
        service: parseService(chat.network),
        networkRaw: chat.network || "Unknown",
        accountId: chat.accountID || "",
        lastMessageAt: chat.lastActivity,
        unreadCount: chat.unreadCount,
        isMuted: chat.isMuted,
        isArchived: chat.isArchived,
      }));

      // Sort by last message time
      return transformedChats.sort((a, b) => {
        const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return timeB - timeA;
      });
    },
    [],
    {
      keepPreviousData: true,
      onError: (err) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load chats",
          message: err.message,
        });
      },
    },
  );

  // Filter chats by selected network
  const filteredChats = serviceFilter === "all" ? chats : chats?.filter((chat) => chat.networkRaw === serviceFilter);

  // Get unique networks for filter dropdown (using raw network names)
  const availableNetworks = [...new Set(chats?.map((c) => c.networkRaw) || [])].sort();

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter chats by name..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Service" value={serviceFilter} onChange={setServiceFilter}>
          <List.Dropdown.Item title="All Services" value="all" icon={Icon.Globe} />
          <List.Dropdown.Section title="Services">
            {availableNetworks.map((network) => {
              // Use parseService for icon matching (best effort)
              const iconConfig = getServiceIcon(parseService(network));
              return (
                <List.Dropdown.Item
                  key={network}
                  title={network}
                  value={network}
                  icon={{ source: iconConfig.icon as Icon, tintColor: iconConfig.tintColor }}
                />
              );
            })}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Cannot connect to Beeper"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
              {error.message.includes("Authentication failed") && (
                <Action
                  title="Re-Authenticate (Reset)"
                  icon={Icon.Logout}
                  onAction={async () => {
                    await resetAuth();
                    await showToast(Toast.Style.Success, "Token cleared", "Please refresh to sign in again");
                    revalidate();
                  }}
                />
              )}
            </ActionPanel>
          }
        />
      ) : !chats || chats.length === 0 ? (
        <List.EmptyView
          icon={Icon.Message}
          title="No chats found"
          description="Make sure you have chats in Beeper Desktop"
        />
      ) : (
        // Show flat list sorted by time (already sorted in useCachedPromise)
        filteredChats?.map((chat) => <ChatListItem key={chat.id} chat={chat} onOpen={revalidate} />)
      )}
    </List>
  );
}

export default withAccessToken(createBeeperOAuth())(OpenChatCommand);

interface ChatListItemProps {
  chat: BeeperChatItem;
  onOpen?: () => void;
}

function ChatListItem({ chat, onOpen }: ChatListItemProps) {
  const serviceInfo = getServiceIcon(chat.service);
  const accessoryTitle = chat.lastMessageAt
    ? formatTimeDistance(new Date(chat.lastMessageAt).getTime(), { suffix: true, max: 1 })
    : "";

  async function handleOpenChat() {
    const result = await openChat({ chatId: chat.id });

    if (result.success) {
      showToast({
        style: Toast.Style.Success,
        title: "Opened chat",
        message: chat.name,
      });
      onOpen?.();
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to open chat",
        message: result.error,
      });
    }
  }

  const accessories: List.Item.Accessory[] = [{ text: accessoryTitle, tooltip: "Last message" }];

  if (chat.unreadCount && chat.unreadCount > 0) {
    accessories.unshift({
      tag: { value: String(chat.unreadCount), color: serviceInfo.color },
      tooltip: "Unread messages",
    });
  }

  if (chat.isMuted) {
    accessories.unshift({ icon: Icon.BellDisabled, tooltip: "Muted" });
  }

  return (
    <List.Item
      id={chat.id}
      title={chat.name}
      subtitle={chat.networkRaw + (chat.type === "group" ? " · Group" : "")}
      icon={{ source: serviceInfo.icon as Icon, tintColor: serviceInfo.tintColor }}
      accessories={accessories}
      keywords={[chat.networkRaw, chat.service, getServiceDisplayName(chat.service)]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Open in Beeper" icon={Icon.Message} onAction={handleOpenChat} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard content={chat.name} title="Copy Name" />
            <Action.CopyToClipboard content={chat.id} title="Copy Chat ID" />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh Chats"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onOpen}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
