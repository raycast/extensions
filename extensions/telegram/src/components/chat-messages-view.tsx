import { useState, useEffect } from "react";
import { List, Icon, LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getChatMessages, ChatMessage, Chat } from "../services/telegram-client";
import { getConfig, ensureAuthenticated } from "../utils/auth";
import { ChatMessageListItem } from "./chat-message-list-item";

const SHOW_DETAIL_KEY = "view_chat_messages_show_detail";

function groupMessagesByDate(messages: ChatMessage[]): Map<string, ChatMessage[]> {
  const groups = new Map<string, ChatMessage[]>();

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

interface ChatMessagesViewProps {
  chat: Chat;
}

export function ChatMessagesView({ chat }: ChatMessagesViewProps) {
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
    async (chatId: string, query: string) => {
      const authenticated = await ensureAuthenticated();
      if (!authenticated) {
        return [];
      }

      const config = getConfig();
      return await getChatMessages({ config, chatId, limit: 50, searchQuery: query || undefined });
    },
    [chat.id, searchText],
    {
      initialData: [],
    },
  );

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search messages in ${chat.title}...`}
      onSearchTextChange={setSearchText}
      isShowingDetail={isShowingDetail}
      navigationTitle={chat.title}
      throttle
    >
      {messages.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Message}
          title="No Messages"
          description={searchText ? "No messages match your search." : "This chat has no messages yet."}
        />
      ) : (
        Array.from(groupedMessages.entries()).map(([dateKey, dateMessages]) => (
          <List.Section key={dateKey} title={dateKey}>
            {dateMessages.map((message) => (
              <ChatMessageListItem
                key={message.id}
                message={message}
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
