import { useState } from "react";
import { List, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getChatMessages, Chat } from "../services/telegram-client";
import { getConfig, ensureAuthenticated } from "../utils/auth";
import { groupMessagesByDate } from "../utils/message";
import { ChatMessageListItem } from "./chat-message-list-item";
import { useDetailToggle } from "../hooks/use-detail-toggle";

const SHOW_DETAIL_KEY = "view_chat_messages_show_detail";

interface ChatMessagesViewProps {
  chat: Chat;
}

export function ChatMessagesView({ chat }: ChatMessagesViewProps) {
  const [searchText, setSearchText] = useState("");
  const [isShowingDetail, handleToggleDetail] = useDetailToggle(SHOW_DETAIL_KEY);

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
