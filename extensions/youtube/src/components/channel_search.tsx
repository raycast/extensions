import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect, useState } from "react";
import { Preferences } from "../lib/types";
import { getErrorMessage } from "../lib/utils";
import { Channel, getChannels, searchChannels, useRefresher } from "../lib/youtubeapi";
import { ChannelItem } from "./channel";
import { FilterDropdown, normalizeFilterOrder } from "./dropdown";
import { ListOrGrid, ListOrGridEmptyView, ListOrGridSection } from "./listgrid";
import { getPinnedChannels, getRecentChannels } from "./recent_channels";

export function SearchChannelList({ searchQuery }: { searchQuery?: string | undefined }) {
  const { griditemsize, showRecentChannels } = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState<string>(searchQuery || "");
  const [order, setOrder] = useCachedState<string>("search-channel-order", "relevance");
  const normalizedOrder = normalizeFilterOrder("channel", order);
  const { data, error, isLoading } = useRefresher<Channel[] | undefined>(async () => {
    if (searchText) {
      return await searchChannels(searchText, { order: normalizedOrder });
    }
    return undefined;
  }, [searchText, normalizedOrder]);
  const [loading, setLoading] = useState<boolean>(true);
  const [pinnedChannels, setPinnedChannels] = useState<Channel[]>([]);
  const [recentChannels, setRecentChannels] = useState<Channel[]>([]);
  const [state, setState] = useState<boolean>(false);
  const refresh = () => setState(!state);
  const hasQuery = (searchText || "").trim().length > 0;

  useEffect(() => {
    if (error) {
      showToast(Toast.Style.Failure, "Could not search channels", getErrorMessage(error));
    }
  }, [error]);

  useEffect(() => {
    (async () => {
      try {
        setPinnedChannels(await getChannels(await getPinnedChannels()));
        setRecentChannels(await getChannels(await getRecentChannels()));
      } catch (error) {
        showToast(Toast.Style.Failure, "Could not load Recent/Pinned Channels", getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    })();
  }, [state]);

  return hasQuery ? (
    data && data.length > 0 ? (
      <ListOrGrid
        isLoading={isLoading}
        columns={griditemsize}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        throttle={true}
        searchBarAccessory={<FilterDropdown kind="channel" onChange={setOrder} value={normalizedOrder} />}
      >
        {data.map((c) => (
          <ChannelItem key={c.id} channel={c} refresh={refresh} />
        ))}
      </ListOrGrid>
    ) : // While searching but without results yet, keep showing the recent/pinned view
    !loading ? (
      <ListOrGrid
        isLoading={true}
        columns={griditemsize}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        throttle={true}
      >
        {recentChannels.length === 0 && pinnedChannels.length === 0 && (
          <ListOrGridEmptyView title="Type to find your favorite creators" icon="../assets/youtube.svg" />
        )}
        <ListOrGridSection title="Pinned Channels">
          {pinnedChannels.map((c: Channel) => (
            <ChannelItem key={c.id} channel={c} refresh={refresh} pinned />
          ))}
        </ListOrGridSection>
        {showRecentChannels && (
          <ListOrGridSection title="Recent Channels">
            {recentChannels.map((c: Channel) => (
              <ChannelItem key={c.id} channel={c} refresh={refresh} recent />
            ))}
          </ListOrGridSection>
        )}
      </ListOrGrid>
    ) : (
      <ListOrGrid isLoading={true} />
    )
  ) : !loading ? (
    <ListOrGrid
      isLoading={false}
      columns={griditemsize}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle={true}
    >
      {recentChannels.length === 0 && pinnedChannels.length === 0 && (
        <ListOrGridEmptyView title="Type to find your favorite creators" icon="../assets/youtube.svg" />
      )}
      <ListOrGridSection title="Pinned Channels">
        {pinnedChannels.map((c: Channel) => (
          <ChannelItem key={c.id} channel={c} refresh={refresh} pinned />
        ))}
      </ListOrGridSection>
      {showRecentChannels && (
        <ListOrGridSection title="Recent Channels">
          {recentChannels.map((c: Channel) => (
            <ChannelItem key={c.id} channel={c} refresh={refresh} recent />
          ))}
        </ListOrGridSection>
      )}
    </ListOrGrid>
  ) : (
    <ListOrGrid isLoading={true} />
  );
}
