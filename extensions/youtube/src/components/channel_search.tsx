import { List, showToast, ToastStyle } from "@raycast/api";
import { useState } from "react";
import { getErrorMessage } from "../lib/utils";
import { Channel, searchChannels, useRefresher } from "../lib/youtubeapi";
import { ChannelListItem } from "./channel";
import { RecentSearchesList, useRecentSearch } from "./search";

export function SearchChannelList() {
  const [searchText, setSearchText] = useState<string>();
  const {
    data: rc,
    appendRecentSearches,
    clearAllRecentSearches,
  } = useRecentSearch("recent_channel_searches", setSearchText);
  const { data, error, isLoading } = useRefresher<Channel[] | undefined>(async () => {
    if (searchText) {
      return await searchChannels(searchText);
    }
    return undefined;
  }, [searchText]);
  if (error) {
    showToast(ToastStyle.Failure, "Could not search channels", getErrorMessage(error));
  }
  if (data) {
    return (
      <List isLoading={isLoading} onSearchTextChange={setSearchText} throttle={true}>
        {data?.map((c) => (
          <ChannelListItem key={c.id} channel={c} />
        ))}
      </List>
    );
  } else {
    const isLoadingTotal = !searchText ? rc === undefined : true;
    return (
      <RecentSearchesList
        recentSearches={rc}
        isLoading={isLoadingTotal}
        setRootSearchText={appendRecentSearches}
        clearAll={clearAllRecentSearches}
      />
    );
  }
}
