import { List, Toast, showToast } from "@raycast/api";
import { GMailMessageListItem } from "./components/message/list";
import { useState } from "react";
import { generateQuery, getGMailMessages } from "./lib/gmail";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { getErrorMessage } from "./lib/utils";
import View from "./components/view";
import { getGMailClient } from "./lib/withGmailClient";

function UnreadMailsRootCommand() {
  const [searchText, setSearchText] = useState<string>();
  const query = generateQuery({ baseQuery: ["is:draft"], userQuery: searchText });
  const { gmail } = getGMailClient();
  const { isLoading, data, error, revalidate } = useCachedPromise(
    async (q: string) => {
      return await getGMailMessages(gmail, q);
    },
    [query],
    { keepPreviousData: true },
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
      <List.EmptyView
        title={!searchText || searchText.length <= 0 ? "No Drafts" : "No Draft-Mails found matching your Criteria"}
        icon="gmail.svg"
      />
    </List>
  );
}

export default function Command() {
  return (
    <View>
      <UnreadMailsRootCommand />
    </View>
  );
}
