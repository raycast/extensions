import { useState } from "react";
import { List, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getConfig, ensureAuthenticated } from "./utils/auth";
import { groupChatsByPinned } from "./utils/chat";
import { getChats } from "./services/telegram-client";
import { ChatListItem } from "./components/chat-list-item";
import { useDetailToggle } from "./hooks/use-detail-toggle";

const SHOW_DETAIL_KEY = "browse_chats_show_detail";

export default function BrowseChats() {
  const [searchText, setSearchText] = useState("");
  const [isShowingDetail, handleToggleDetail] = useDetailToggle(SHOW_DETAIL_KEY);

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

  const filteredChats = chats.filter((chat) => chat.title.toLowerCase().includes(searchText.toLowerCase()));
  const groupedChats = groupChatsByPinned(filteredChats);

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
