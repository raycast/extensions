import { List, Toast, showToast } from "@raycast/api";
import { GMailMessageListItem } from "./components/message/list";
import { useMessageDetails } from "./components/messages/hooks";
import { useState } from "react";
import { generateQuery } from "./lib/gmail";

export default function MessageRootCommand() {
  const [searchText, setSearchText] = useState<string>();
  const query = generateQuery({ baseQuery: ["-is:draft"], userQuery: searchText });
  const { data, isLoading, error, resultSizeEstimate } = useMessageDetails(query);
  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Error", message: error });
  }
  const subtitle = () => {
    if (!data) {
      return;
    }
    const parts = [data.length.toString()];
    if (resultSizeEstimate !== undefined && resultSizeEstimate !== null) {
      parts.push(resultSizeEstimate.toString());
    }
    return parts.join("/");
  };
  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} throttle>
      <List.Section title="Mails" subtitle={subtitle()}>
        {data?.map((l) => (
          <GMailMessageListItem key={l.data.id} message={l.data} />
        ))}
      </List.Section>
    </List>
  );
}
