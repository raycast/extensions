import { useState } from "react";
import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Chat, getChatTopics } from "../services/telegram-client";
import { getConfig, ensureAuthenticated } from "../utils/auth";
import { useDetailToggle } from "../hooks/use-detail-toggle";
import { ChatTopicListItem } from "./chat-topic-list-item";

const SHOW_DETAIL_KEY = "view_chat_topics_show_detail";

interface ChatTopicsViewProps {
  chat: Chat;
}

export function ChatTopicsView({ chat }: ChatTopicsViewProps) {
  const [searchText, setSearchText] = useState("");
  const [isShowingDetail, handleToggleDetail] = useDetailToggle(SHOW_DETAIL_KEY);

  const {
    data: topics,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (chatId: string, query: string) => {
      const authenticated = await ensureAuthenticated();
      if (!authenticated) {
        return [];
      }

      return await getChatTopics({
        config: getConfig(),
        chatId,
        limit: 100,
        searchQuery: query || undefined,
      });
    },
    [chat.id, searchText],
    { initialData: [] },
  );

  const pinnedTopics = topics.filter((topic) => topic.isPinned);
  const otherTopics = topics.filter((topic) => !topic.isPinned);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search topics in ${chat.title}...`}
      onSearchTextChange={setSearchText}
      isShowingDetail={isShowingDetail}
      navigationTitle={`${chat.title} · Topics`}
      throttle
    >
      {topics.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Hashtag}
          title={searchText ? "No Topics Found" : "No Topics"}
          description={searchText ? "No topics match your search." : "This forum group has no visible topics."}
        />
      ) : (
        <>
          {pinnedTopics.length > 0 ? (
            <List.Section title="Pinned" subtitle={`${pinnedTopics.length}`}>
              {pinnedTopics.map((topic) => (
                <ChatTopicListItem
                  key={topic.id}
                  chat={chat}
                  topic={topic}
                  isShowingDetail={isShowingDetail}
                  onRefresh={revalidate}
                  onToggleDetail={handleToggleDetail}
                />
              ))}
            </List.Section>
          ) : null}
          {otherTopics.length > 0 ? (
            <List.Section title="Topics" subtitle={`${otherTopics.length}`}>
              {otherTopics.map((topic) => (
                <ChatTopicListItem
                  key={topic.id}
                  chat={chat}
                  topic={topic}
                  isShowingDetail={isShowingDetail}
                  onRefresh={revalidate}
                  onToggleDetail={handleToggleDetail}
                />
              ))}
            </List.Section>
          ) : null}
        </>
      )}
    </List>
  );
}
