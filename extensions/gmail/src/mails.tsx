import { List, Toast, showToast } from "@raycast/api";
import { GMailMessageListItem, QueryListDropdown } from "./components/message/list";
import { useState } from "react";
import { generateQuery, getGMailMessages } from "./lib/gmail";
import { getLabelName, isMailUnread } from "./components/message/utils";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { getErrorMessage } from "./lib/utils";
import { useLabels } from "./components/message/hooks";
import { GMailContext } from "./components/context";
import View from "./components/view";
import { getGMailClient } from "./lib/withGmailClient";

function MessageRootCommand() {
  const [searchText, setSearchText] = useState<string>();
  const query = generateQuery({ baseQuery: ["-is:draft", "label=INBOX"], userQuery: searchText });
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
    <GMailContext.Provider value={labels}>
      <List
        isLoading={isLoading}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        isShowingDetail={showDetails}
        searchBarAccessory={<QueryListDropdown labels={labels} setSearchText={setSearchText} />}
        throttle
      >
        <List.Section
          title="Unread"
          subtitle={unread !== undefined && unread.length > 0 ? unread?.length.toString() : undefined}
        >
          {unread?.map((l) => (
            <GMailMessageListItem
              key={`${l.data.id}_unread`}
              message={l.data}
              onRevalidate={revalidate}
              detailsShown={showDetails}
              onDetailsShownChanged={setShowDetails}
              allUnreadMessages={unread.map((u) => u.data)}
              showUnreadAccessory={false}
              searchText={searchText}
              setSearchText={setSearchText}
            />
          ))}
        </List.Section>
        <List.Section title="Mails" subtitle={subtitle()}>
          {rest?.map((l) => (
            <GMailMessageListItem
              key={l.data.id}
              message={l.data}
              onRevalidate={revalidate}
              detailsShown={showDetails}
              onDetailsShownChanged={setShowDetails}
              searchText={searchText}
              setSearchText={setSearchText}
            />
          ))}
        </List.Section>
        <List.EmptyView
          title={
            !searchText || searchText.length <= 0 ? "No Mails in your Inbox" : "No Mails found matching your Criteria"
          }
          icon="gmail.svg"
        />
      </List>
    </GMailContext.Provider>
  );
}

export default function Command() {
  return (
    <View>
      <MessageRootCommand />
    </View>
  );
}
