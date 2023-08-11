import { List, Toast, showToast } from "@raycast/api";
import { GMailMessageListItem } from "./components/message/list";
import { useState } from "react";
import { generateQuery, getGMailMessages } from "./lib/gmail";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { getErrorMessage } from "./lib/utils";
import { useLabels } from "./components/message/hooks";
import { GMailContext } from "./components/context";
import View from "./components/view";
import { getGMailClient } from "./lib/withGmailClient";

function UnreadMailsRootCommand() {
  const [searchText, setSearchText] = useState<string>();
  const query = generateQuery({ baseQuery: ["is:unread", "label=INBOX"], userQuery: searchText });
  const { gmail } = getGMailClient();
  const { isLoading, data, error, revalidate } = useCachedPromise(
    async (q: string) => {
      return await getGMailMessages(gmail, q);
    },
    [query],
    { keepPreviousData: true },
  );
  const { labels } = useLabels();
  const [showDetails, setShowDetails] = useCachedState("show-details", false, { cacheNamespace: "mails" });
  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Error", message: getErrorMessage(error) });
  }
  return (
    <GMailContext.Provider value={labels}>
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
              searchText={searchText}
              setSearchText={setSearchText}
            />
          ))}
        </List.Section>
        <List.EmptyView
          title={!searchText || searchText.length <= 0 ? "No unread Mails 🤗" : "No Mails found matching your Criteria"}
          icon="gmail.svg"
        />
      </List>
    </GMailContext.Provider>
  );
}

export default function Command() {
  return (
    <View>
      <UnreadMailsRootCommand />
    </View>
  );
}
