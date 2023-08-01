import { List, Toast, showToast } from "@raycast/api";
import { GMailMessageListItem } from "./components/message/list";
import { useMessageDetails } from "./components/messages/hooks";
import { useState } from "react";
import { generateQuery } from "./lib/gmail";
import { isMailUnread } from "./components/message/utils";

export default function MessageRootCommand() {
  const [searchText, setSearchText] = useState<string>();
  const query = generateQuery({ baseQuery: ["-is:draft"], userQuery: searchText });
  const { data, isLoading, error } = useMessageDetails(query);
  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Error", message: error });
  }
  const subtitle = () => {
    if (!data) {
      return;
    }
    const parts = [data.length.toString()];
    return parts.join("/");
  };

  const unread = data?.filter((m) => isMailUnread(m.data));
  const rest = data?.filter((m) => !isMailUnread(m.data));
  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} throttle>
      <List.Section
        title="Unread"
        subtitle={unread !== undefined && unread.length > 0 ? unread?.length.toString() : undefined}
      >
        {unread?.map((l) => (
          <GMailMessageListItem key={l.data.id} message={l.data} />
        ))}
      </List.Section>
      <List.Section title="Mails" subtitle={subtitle()}>
        {rest?.map((l) => (
          <GMailMessageListItem key={l.data.id} message={l.data} />
        ))}
      </List.Section>
    </List>
  );
}
