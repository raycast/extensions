import { Action, ActionPanel, Icon, Color, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { Preferences } from "../lib/types";
import { getErrorMessage } from "../lib/utils";
import { Channel, searchChannels, getChannels, useRefresher } from "../lib/youtubeapi";
import { ChannelItem } from "./channel";
import { ListOrGrid, ListOrGridEmptyView, ListOrGridSection } from "./listgrid";
import { getPinnedChannels, getRecentChannels } from "./recent_channels";

export function SearchChannelList({ searchQuery }: { searchQuery?: string | undefined }) {
  const { griditemsize, showRecentChannels } = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState<string>(searchQuery || "");
  const { data, error, isLoading } = useRefresher<Channel[] | undefined>(async () => {
    if (searchText) {
      return await searchChannels(searchText);
    }
    return undefined;
  }, [searchText]);
  if (error) {
    showToast(Toast.Style.Failure, "Could not search channels", getErrorMessage(error));
  }
  const [loading, setLoading] = useState<boolean>(true);
  const [pinnedChannels, setPinnedChannels] = useState<Channel[]>([]);
  const [recentChannels, setRecentChannels] = useState<Channel[]>([]);
  const [state, setState] = useState<boolean>(false);
  const refresh = () => setState(!state);

  useEffect(() => {
    (async () => {
      setPinnedChannels(await getChannels(getPinnedChannels()));
      setRecentChannels(await getChannels(getRecentChannels()));
      setLoading(false);
    })();
  }, [state]);

  return data ? (
    <ListOrGrid isLoading={isLoading} columns={griditemsize} onSearchTextChange={setSearchText} throttle={true}>
      {data.map((c) => (
        <ChannelItem key={c.id} channel={c} refresh={refresh} />
      ))}
    </ListOrGrid>
  ) : !loading ? (
    <ListOrGrid isLoading={isLoading} columns={griditemsize} onSearchTextChange={setSearchText} throttle={true}>
      {recentChannels.length === 0 && pinnedChannels.length === 0 && (
        <ListOrGridEmptyView title="Search Channels" icon="../assets/youtube.svg" />
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
