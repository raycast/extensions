import { showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { getErrorMessage, getUuid } from "../lib/utils";
import { Channel, searchChannels, useRefresher } from "../lib/youtubeapi";
import { ChannelItem } from "./channel";
import { RecentSearchesList, useRecentSearch } from "./search";
import { ListOrGrid, getViewLayout, getGridItemSize } from "./listgrid";

export function SearchChannelList() {
  const [searchText, setSearchText] = useState<string>();
  const [uuid] = useState<string>(getUuid());
  const {
    data: rc,
    appendRecentSearches,
    clearAllRecentSearches,
  } = useRecentSearch("recent_channel_searches", uuid, setSearchText);
  const { data, error, isLoading } = useRefresher<Channel[] | undefined>(async () => {
    if (searchText) {
      return await searchChannels(searchText);
    }
    return undefined;
  }, [searchText]);
  if (error) {
    showToast(Toast.Style.Failure, "Could not search channels", getErrorMessage(error));
  }
  const layout = getViewLayout();
  if (data) {
    return (
      <ListOrGrid
        layout={layout}
        itemSize={getGridItemSize()}
        isLoading={isLoading}
        searchText={searchText}
        onSearchTextChange={(search: string) => {
          if (layout === "list" || search) appendRecentSearches(search);
        }}
        throttle={true}
      >
        {data?.map((c) => (
          <ChannelItem key={c.id} channel={c} />
        ))}
      </ListOrGrid>
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
