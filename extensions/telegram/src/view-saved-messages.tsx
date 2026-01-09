import { useState, useEffect } from "react";
import { List, Icon, LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getSavedMessages, SavedMessage } from "./services/telegram-client";
import { getConfig, ensureAuthenticated } from "./utils/auth";
import { MessageListItem } from "./components/message-list-item";

const SHOW_DETAIL_KEY = "view_saved_messages_show_detail";

function groupMessagesByDate(messages: SavedMessage[]): Map<string, SavedMessage[]> {
  const groups = new Map<string, SavedMessage[]>();

  messages.forEach((message) => {
    const date = message.date;
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let dateKey: string;

    // Check if it's today
    if (date.toDateString() === today.toDateString()) {
      dateKey = "Today";
    }
    // Check if it's yesterday
    else if (date.toDateString() === yesterday.toDateString()) {
      dateKey = "Yesterday";
    }
    // Otherwise use the full date
    else {
      dateKey = date.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(message);
  });

  return groups;
}

export default function ViewSavedMessages() {
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
