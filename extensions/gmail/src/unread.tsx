import { List, Toast, showToast } from "@raycast/api";
import { GMailMessageListItem } from "./components/message/list";
import { useState } from "react";
import { generateQuery, getGMailMessages } from "./lib/gmail";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { getErrorMessage } from "./lib/utils";

export default function UnreadMailsRootCommand() {
  const [searchText, setSearchText] = useState<string>();
  const query = generateQuery({ baseQuery: ["is:unread"], userQuery: searchText });
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
      <List.Section title="Unread Mails" subtitle={data?.length ? data.length.toString() : undefined}>
        {data?.map((l) => (
          <GMailMessageListItem
            key={l.data.id}
            message={l.data}
            detailsShown={showDetails}
            onDetailsShownChanged={setShowDetails}
            onRevalidate={revalidate}
            showUnreadAccessory={false}
            allUnreadMessages={data?.map((m) => m.data)}
          />
        ))}
      </List.Section>
      <List.EmptyView
        title={!searchText || searchText.length <= 0 ? "No unread Mails 🤗" : "No Mails found matching your Criteria"}
        icon="gmail.svg"
      />
    </List>
  );
}
