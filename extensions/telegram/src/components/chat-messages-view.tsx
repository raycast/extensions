import { useEffect, useMemo, useState } from "react";
import { List, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getChatMessages, Chat, ChatTopic } from "../services/telegram-client";
import { getConfig, ensureAuthenticated } from "../utils/auth";
import { groupMessagesByDate } from "../utils/message";
import { ChatMessageListItem } from "./chat-message-list-item";
import { ChatConversationView } from "./chat-conversation-view";
import { useDetailToggle } from "../hooks/use-detail-toggle";

const SHOW_DETAIL_KEY = "view_chat_messages_show_detail";

interface ChatMessagesViewProps {
  chat: Chat;
  topic?: ChatTopic;
}

export function ChatMessagesView({ chat, topic }: ChatMessagesViewProps) {
  const [searchText, setSearchText] = useState("");
  const [viewMode, setViewMode] = useState<"conversation" | "list">("list");
  const [selectedMessageId, setSelectedMessageId] = useState<string>();
  const [isShowingDetail, handleToggleDetail] = useDetailToggle(SHOW_DETAIL_KEY);

  const {
    data: messages,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (chatId: string, topicId: number | undefined, query: string) => {
      const authenticated = await ensureAuthenticated();
      if (!authenticated) {
        return [];
      }

      const config = getConfig();
      return await getChatMessages({ config, chatId, topicId, limit: 50, searchQuery: query || undefined });
    },
    [chat.id, topic?.id, searchText],
    {
      initialData: [],
    },
  );

  const chronologicalMessages = useMemo(
    () => [...messages].sort((left, right) => left.date.getTime() - right.date.getTime()),
    [messages],
  );
  const groupedMessages = groupMessagesByDate(chronologicalMessages);
  const destination = topic ? `${chat.title} · ${topic.title}` : chat.title;
  const newestMessageId = chronologicalMessages.at(-1)?.id.toString();

  useEffect(() => {
    setSelectedMessageId(newestMessageId);
  }, [chat.id, topic?.id, newestMessageId]);

  if (viewMode === "conversation") {
    return (
      <ChatConversationView
        chat={chat}
        topic={topic}
        messages={chronologicalMessages}
        isLoading={isLoading}
        onRefresh={revalidate}
        onShowCompactList={() => setViewMode("list")}
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search messages in ${destination}...`}
      onSearchTextChange={setSearchText}
      selectedItemId={selectedMessageId}
      onSelectionChange={(id) => setSelectedMessageId(id ?? undefined)}
      isShowingDetail={isShowingDetail}
      navigationTitle={destination}
      throttle
    >
      {messages.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Message}
          title="No Messages"
          description={searchText ? "No messages match your search." : "This conversation has no messages yet."}
        />
      ) : (
        Array.from(groupedMessages.entries()).map(([dateKey, dateMessages]) => (
          <List.Section
            key={dateKey}
            title={dateKey}
            subtitle={`${dateMessages.length} ${dateMessages.length === 1 ? "message" : "messages"}`}
          >
            {dateMessages.map((message) => (
              <ChatMessageListItem
                key={message.id}
                message={message}
                chat={chat}
                topic={topic}
                isShowingDetail={isShowingDetail}
                onRefresh={revalidate}
                onToggleDetail={handleToggleDetail}
                onShowConversation={() => {
                  setSearchText("");
                  setViewMode("conversation");
                }}
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
