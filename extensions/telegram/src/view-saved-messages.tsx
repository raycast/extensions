import { useState } from "react";
import { List, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getSavedMessages } from "./services/telegram-client";
import { getConfig, ensureAuthenticated } from "./utils/auth";
import { groupMessagesByDate } from "./utils/date";
import { MessageListItem } from "./components/message-list-item";
import { useDetailToggle } from "./hooks/use-detail-toggle";

const SHOW_DETAIL_KEY = "view_saved_messages_show_detail";

export default function ViewSavedMessages() {
  const [searchText, setSearchText] = useState("");
  const [isShowingDetail, handleToggleDetail] = useDetailToggle(SHOW_DETAIL_KEY);

  const {
    data: messages,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (query: string) => {
      const authenticated = await ensureAuthenticated();
      if (!authenticated) {
        return [];
      }

      const config = getConfig();
      return await getSavedMessages({ config, limit: 50, searchQuery: query || undefined });
    },
    [searchText],
    {
      initialData: [],
    },
  );

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search saved messages..."
      onSearchTextChange={setSearchText}
      isShowingDetail={isShowingDetail}
      throttle
    >
      {messages.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Message}
          title="No Saved Messages"
          description="You haven't saved any messages yet. Send yourself a message to get started!"
        />
      ) : (
        Array.from(groupedMessages.entries()).map(([dateKey, dateMessages]) => (
          <List.Section key={dateKey} title={dateKey}>
            {dateMessages.map((message) => (
              <MessageListItem
                key={message.id}
                message={message}
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
