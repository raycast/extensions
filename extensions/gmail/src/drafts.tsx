import { List, Toast, showToast } from "@raycast/api";
import { GMailMessageListItem } from "./components/message/list";
import { useState } from "react";
import { generateQuery, getGMailMessages } from "./lib/gmail";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { getErrorMessage } from "./lib/utils";

export default function UnreadMailsRootCommand() {
  const [searchText, setSearchText] = useState<string>();
  const query = generateQuery({ baseQuery: ["is:draft"], userQuery: searchText });
  const { isLoading, data, error, revalidate } = useCachedPromise(
    async (q: string) => {
      return await getGMailMessages(q);
    },
    [query],
    { keepPreviousData: true }
  );
  const [showDetails, setShowDetails] = useCachedState("show-details", false, { cacheNamespace: "mails" });
  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Error", message: getErrorMessage(error) });
  }
  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} isShowingDetail={showDetails} throttle>
      <List.Section title="Draft Mails" subtitle={data?.length ? data.length.toString() : undefined}>
        {data?.map((l) => (
          <GMailMessageListItem
            key={l.data.id}
            message={l.data}
            onRevalidate={revalidate}
            detailsShown={showDetails}
            onDetailsShownChanged={setShowDetails}
          />
        ))}
      </List.Section>
    </List>
  );
}
