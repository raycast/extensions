import { List, Toast, showToast } from "@raycast/api";
import { GMailMessageListItem } from "./components/message/list";
import { useMessageDetails } from "./components/messages/hooks";
import { useState } from "react";
import { generateQuery } from "./lib/gmail";

export default function UnreadMailsRootCommand() {
  const [searchText, setSearchText] = useState<string>();
  const query = generateQuery({ baseQuery: ["is:unread"], userQuery: searchText });
  const { data, isLoading, error } = useMessageDetails(query);
  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Error", message: error });
  }
  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} throttle>
      <List.Section title="Unread Mails" subtitle={data?.length ? data.length.toString() : undefined}>
        {data?.map((l) => (
          <GMailMessageListItem key={l.data.id} message={l} />
        ))}
      </List.Section>
    </List>
  );
}
