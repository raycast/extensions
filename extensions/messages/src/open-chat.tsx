import { List, ActionPanel, getPreferenceValues, LaunchProps } from "@raycast/api";
import { format } from "date-fns";
import { useRef, useState } from "react";

import { ChatPhotoMode, normalizePhotoMode } from "./chat-photo-hydration";
import CreateMessagesQuicklink from "./components/CreateMessagesQuicklink";
import OpenInMessages from "./components/OpenInMessages";
import StartNewChat from "./components/StartNewChat";
import { useChats } from "./hooks/useChats";

type OpenChatLaunchContext = {
  photoMode?: ChatPhotoMode;
  searchText?: string;
  matchStrategy?: string;
};

export default function Command({
  launchContext,
}: LaunchProps<{
  launchContext?: OpenChatLaunchContext;
}>) {
  const initialSearchTextRef = useRef(typeof launchContext?.searchText === "string" ? launchContext.searchText : "");
  const preferences = getPreferenceValues();
  const preferenceLoadContactPhotos = preferences.loadContactPhotos ?? true;
  const photoMode = normalizePhotoMode(launchContext?.photoMode) ?? (preferenceLoadContactPhotos ? "visible" : "off");
  const [searchText, setSearchText] = useState(initialSearchTextRef.current);
  const {
    data: chats,
    isLoading,
    permissionView,
  } = useChats(searchText, {
    photoMode,
    matchStrategy: launchContext?.matchStrategy,
    showFallbackWhileHydrating: false,
  });

  if (permissionView) {
    return permissionView;
  }

  // Allow only digits, spaces, parentheses, plus, and hyphens for phone input
  const isPotentialNumber = /^[0-9()+\-\s]+$/.test(searchText);

  // Never blank the list while refreshing — only spin when we have nothing to show yet.
  const showLoadingIndicator = Boolean(isLoading && !chats?.length);

  return (
    <List
      isLoading={showLoadingIndicator}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
      searchBarPlaceholder="Search chats or enter phone number..."
    >
      {chats && chats.length > 0 ? (
        chats.map((chat) => {
          const date = new Date(chat.last_message_date);
          return (
            <List.Item
              icon={chat.avatar}
              key={chat.chat_identifier}
              title={chat.displayName}
              accessories={[{ date, tooltip: format(date, "PPpp") }]}
              actions={
                <ActionPanel>
                  <OpenInMessages chat={chat} />
                  <CreateMessagesQuicklink chat={chat} />
                </ActionPanel>
              }
            />
          );
        })
      ) : !showLoadingIndicator ? (
        <List.EmptyView
          title={searchText ? "No chats found" : "No chats available"}
          description={
            searchText
              ? isPotentialNumber
                ? `Start a new chat with ${searchText}`
                : `“${searchText}” not found`
              : "Add or sync your chats to see them here"
          }
          actions={
            searchText &&
            isPotentialNumber && (
              <ActionPanel>
                <StartNewChat number={searchText} />
              </ActionPanel>
            )
          }
        />
      ) : null}
    </List>
  );
}
