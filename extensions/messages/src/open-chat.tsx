import { List, ActionPanel } from "@raycast/api";
import { format } from "date-fns";
import { useState } from "react";

import CreateMessagesQuicklink from "./components/CreateMessagesQuicklink";
import HardReloadCache from "./components/HardReloadCache";
import OpenInMessages from "./components/OpenInMessages";
import { useOpenChats } from "./hooks/useOpenChats";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { data: chats, isLoading, permissionView, hardReload } = useOpenChats(searchText);

  if (permissionView) {
    return permissionView;
  }

  const showLoadingIndicator = Boolean(isLoading && !chats?.length);

  return (
    <List
      isLoading={showLoadingIndicator}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
      searchBarPlaceholder="Search chats..."
    >
      {chats && chats.length > 0 ? (
        chats.map((chat) => {
          const date = chat.last_message_date ? new Date(chat.last_message_date) : undefined;

          return (
            <List.Item
              icon={chat.avatar}
              key={chat.guid}
              title={chat.displayName}
              accessories={date && !Number.isNaN(date.getTime()) ? [{ date, tooltip: format(date, "PPpp") }] : []}
              actions={
                <ActionPanel>
                  <OpenInMessages chat={chat} />
                  <CreateMessagesQuicklink chat={chat} />
                  <HardReloadCache onReload={hardReload} />
                </ActionPanel>
              }
            />
          );
        })
      ) : !showLoadingIndicator ? (
        <List.EmptyView
          title={searchText ? "No chats found" : "No chats available"}
          description={
            searchText ? `No existing chat matches “${searchText}”` : "Add or sync your chats to see them here"
          }
          actions={
            <ActionPanel>
              <HardReloadCache onReload={hardReload} />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}
