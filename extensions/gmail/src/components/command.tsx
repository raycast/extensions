import { List, Toast, showToast } from "@raycast/api";
import { GMailMessageListItem } from "./message/list";
import { useState } from "react";
import { generateQuery, getGMailMessages } from "../lib/gmail";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { getErrorMessage } from "../lib/utils";
import { useLabels } from "../components/message/hooks";
import { GMailContext } from "../components/context";
import { getGMailClient } from "../lib/withGmailClient";

export function ListQueryCommand(props: {
  baseQuery?: string[] | undefined;
  sectionTitle?: string;
  emptyMessage?: string;
}) {
  const [searchText, setSearchText] = useState<string>();
  const query = generateQuery({ baseQuery: props.baseQuery, userQuery: searchText });
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
      <List
        isLoading={isLoading}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        isShowingDetail={showDetails}
        throttle
      >
        <List.Section title={props.sectionTitle} subtitle={data?.length ? data.length.toString() : undefined}>
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
          title={
            !searchText || searchText.length <= 0
              ? props.emptyMessage
                ? props.emptyMessage
                : "No Results"
              : "No Mails found matching your Criteria"
          }
          icon="gmail.svg"
        />
      </List>
    </GMailContext.Provider>
  );
}
