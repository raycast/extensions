import { List, Toast, showToast } from "@raycast/api";
import { GMailMessageListItem } from "./components/message/list";
import { useState } from "react";
import { generateQuery, getGMailMessages } from "./lib/gmail";
import { useCachedPromise } from "@raycast/utils";
import { getErrorMessage } from "./lib/utils";

export default function UnreadMailsRootCommand() {
  const [searchText, setSearchText] = useState<string>();
  const query = generateQuery({ baseQuery: ["is:draft"], userQuery: searchText });
  const { isLoading, data, error, revalidate } = useCachedPromise(
    async (q: string) => {
      return await getGMailMessages(q);
    },
    [query]
  );
  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Error", message: getErrorMessage(error) });
  }
  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} throttle>
      <List.Section title="Draft Mails" subtitle={data?.length ? data.length.toString() : undefined}>
        {data?.map((l) => (
          <GMailMessageListItem key={l.data.id} message={l.data} onRevalidate={revalidate} />
        ))}
      </List.Section>
    </List>
  );
}
