import { List, Toast, showToast } from "@raycast/api";
import { GMailMessageListItem } from "./components/message/list";
import { useMessages } from "./components/messages/hooks";
import { useState } from "react";

export default function UnreadMailsRootCommand() {
  const [searchText, setSearchText] = useState<string>();
  const queryParts = ["is:unread"];
  if (searchText) {
    queryParts.push(searchText);
  }
  const query = queryParts.join(" ");
  const { data, isLoading, error } = useMessages(query);
  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Error", message: error });
  }
  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} throttle>
      <List.Section title="Unread Mails" subtitle={data?.length ? data.length.toString() : undefined}>
        {data?.map((l) => (
          <GMailMessageListItem key={l.id} message={l} />
        ))}
      </List.Section>
    </List>
  );
}
