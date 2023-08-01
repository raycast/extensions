import { List, Toast, showToast } from "@raycast/api";
import { GMailMessageListItem } from "./components/message/list";
import { useState } from "react";
import { generateQuery, getGMailMessages } from "./lib/gmail";
import { isMailUnread } from "./components/message/utils";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { getErrorMessage } from "./lib/utils";

export default function MessageRootCommand() {
  const [searchText, setSearchText] = useState<string>();
  const query = generateQuery({ baseQuery: ["-is:draft"], userQuery: searchText });
  const { isLoading, data, error, revalidate } = useCachedPromise(
    async (q: string) => {
      return await getGMailMessages(q);
    },
    [query]
  );
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
    <List isLoading={isLoading} onSearchTextChange={setSearchText} isShowingDetail={showDetails} throttle>
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
          />
        ))}
      </List.Section>
    </List>
  );
}
