import { List, ActionPanel } from "@raycast/api";
import { format } from "date-fns";
import { useState } from "react";

import CreateMessagesQuicklink from "./components/CreateMessagesQuicklink";
import OpenInMessages from "./components/OpenInMessages";
import StartNewChat from "./components/StartNewChat";
import { useChats } from "./hooks/useChats";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { data: chats, isLoading, permissionView } = useChats(searchText);

  if (permissionView) {
    return permissionView;
  }

  const filteredChats = chats?.filter((chat) => {
    if (chat.is_group) return !chat.group_name;
    return true;
  });

  // Allow only digits, spaces, parentheses, plus, and hyphens for phone input
  const isPotentialNumber = /^[0-9()+\-\s]+$/.test(searchText);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      throttle
      searchBarPlaceholder="Search chats or enter phone number..."
    >
      {filteredChats && filteredChats.length > 0 ? (
        filteredChats.map((chat) => {
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
      ) : (
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
      )}
    </List>
  );
}
