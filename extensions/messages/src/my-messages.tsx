import { Icon, List } from "@raycast/api";
import { useState } from "react";

import MessageListItem from "./components/MessageListItem";
import { useMessages } from "./hooks/useMessages";

export type Filter = "" | "contacts" | "unread" | "read" | "me" | "audio" | "attachments";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState<Filter>("");
  const { data: messages, isLoading, mutate, permissionView } = useMessages(searchText, filter);

  if (permissionView) {
    return permissionView;
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Filter your messages" storeValue onChange={(filter) => setFilter(filter as Filter)}>
          <List.Dropdown.Item title="All Messages" icon={Icon.Message} value="" />
          <List.Dropdown.Item title="From Contacts" icon={Icon.CheckCircle} value="contacts" />
          <List.Dropdown.Item title="From Me" icon={Icon.Person} value="me" />

          <List.Dropdown.Section>
            <List.Dropdown.Item title="Unread Messages" icon={Icon.Circle} value="unread" />
            <List.Dropdown.Item title="Read Messages" icon={Icon.Checkmark} value="read" />
            <List.Dropdown.Item title="Audio Messages" icon={Icon.Waveform} value="audio" />
            <List.Dropdown.Item title="Messages with Attachments" icon={Icon.Document} value="attachments" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {messages?.map((m) => {
        if (!m.sender || !m.body) return null;
        return <MessageListItem key={m.guid} message={m} mutate={mutate} />;
      })}

      <List.EmptyView title="No messages found" />
    </List>
  );
}
