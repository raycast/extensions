import { List, ActionPanel } from "@raycast/api";
import { format } from "date-fns";
import { useState } from "react";

import CreateMessagesQuicklink from "./components/CreateMessagesQuicklink";
import OpenInMessages from "./components/OpenInMessages";
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

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} throttle>
      {filteredChats?.map((chat) => {
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
      })}
    </List>
  );
}
