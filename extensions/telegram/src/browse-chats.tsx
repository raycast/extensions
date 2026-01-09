import { useState, useEffect } from "react";
import { List, Icon, LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getConfig, ensureAuthenticated } from "./utils/auth";
import { getChats, Chat } from "./services/telegram-client";
import { ChatListItem } from "./components/chat-list-item";

const SHOW_DETAIL_KEY = "browse_chats_show_detail";

function groupChats(chats: Chat[]): Map<string, Chat[]> {
  const groups = new Map<string, Chat[]>();

  // Separate pinned chats
  const pinnedChats = chats.filter((chat) => chat.isPinned);
  const unpinnedChats = chats.filter((chat) => !chat.isPinned);

  // Sort by last message date (most recent first)
  const sortByDate = (a: Chat, b: Chat) => {
    if (!a.lastMessageDate && !b.lastMessageDate) return 0;
    if (!a.lastMessageDate) return 1;
    if (!b.lastMessageDate) return -1;
    return b.lastMessageDate.getTime() - a.lastMessageDate.getTime();
  };

  pinnedChats.sort(sortByDate);
  unpinnedChats.sort(sortByDate);

  if (pinnedChats.length > 0) {
    groups.set("Pinned", pinnedChats);
  }

  if (unpinnedChats.length > 0) {
    groups.set("All Chats", unpinnedChats);
  }

  return groups;
}

export default function BrowseChats() {
  const [searchText, setSearchText] = useState("");
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  useEffect(() => {
    LocalStorage.getItem<boolean>(SHOW_DETAIL_KEY).then((value) => {
      if (value !== undefined) {
        setIsShowingDetail(value);
      }
    });
  }, []);

  const handleToggleDetail = async () => {
    const newValue = !isShowingDetail;
    setIsShowingDetail(newValue);
    await LocalStorage.setItem(SHOW_DETAIL_KEY, newValue);
  };

  const {
    data: chats,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async () => {
      const authenticated = await ensureAuthenticated();
      if (!authenticated) {
        return [];
      }

      const config = getConfig();
      return await getChats({ config, limit: 100 });
    },
    [],
    {
      initialData: [],
    },
  );

  // Filter chats based on search text
  const filteredChats = chats.filter((chat) => chat.title.toLowerCase().includes(searchText.toLowerCase()));
  const groupedChats = groupChats(filteredChats);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search chats..."
      onSearchTextChange={setSearchText}
      isShowingDetail={isShowingDetail}
      throttle
    >
      {filteredChats.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Message}
          title="No Chats Found"
          description={searchText ? "No chats match your search." : "You don't have any chats yet."}
        />
      ) : (
        Array.from(groupedChats.entries()).map(([groupKey, groupChats]) => (
          <List.Section key={groupKey} title={groupKey}>
            {groupChats.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                isShowingDetail={isShowingDetail}
                onRefresh={revalidate}
                onToggleDetail={handleToggleDetail}
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
