import { Action, ActionPanel, Icon, Color, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { Preferences } from "../lib/types";
import { getErrorMessage } from "../lib/utils";
import { Channel, searchChannels, getChannels, useRefresher } from "../lib/youtubeapi";
import { ChannelItem } from "./channel";
import { ListOrGrid, ListOrGridEmptyView, ListOrGridSection } from "./listgrid";
import * as cache from "./recent_channels";

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
  useEffect(() => {
    (async () => {
      setPinnedChannels(await getChannels(cache.getPinnedChannels()));
      setRecentChannels(await getChannels(cache.getRecentChannels()));
      setLoading(false);
    })();
  }, []);

  const PinChannel = ({ channel }: { channel: Channel }): JSX.Element => {
    return (
      <Action
        title="Pin Channel"
        icon={{ source: Icon.Pin, tintColor: Color.PrimaryText }}
        shortcut={{ modifiers: ["cmd"], key: "p" }}
        onAction={() => {
          cache.addPinnedChannel(channel);
          setRecentChannels(recentChannels.filter((c) => c.id !== channel.id));
          setPinnedChannels([...pinnedChannels, channel]);
          showToast(Toast.Style.Success, "Pinned Channel");
        }}
      />
    );
  };
  const PinnedChannelActions = ({ channel }: { channel: Channel }) => (
    <ActionPanel.Section>
      <Action
        title="Remove From Pinned Channels"
        onAction={() => {
          cache.removePinnedChannel(channel.id);
          setPinnedChannels(pinnedChannels.filter((c) => c.id !== channel.id));
          showToast(Toast.Style.Success, "Removed From Pinned Channels");
        }}
        icon={{ source: Icon.XMarkCircle, tintColor: Color.PrimaryText }}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
      <Action
        title="Clear All Pinned Channels"
        onAction={() => {
          cache.clearPinnedChannels();
          setPinnedChannels([]);
          showToast(Toast.Style.Success, "Cleared All Pinned Channels");
        }}
        icon={{ source: Icon.Trash, tintColor: Color.Red }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      />
    </ActionPanel.Section>
  );
  const RecentChannelActions = ({ channel }: { channel: Channel }) => {
    return (
      <ActionPanel.Section>
        <PinChannel channel={channel} />
        <Action
          title="Remove From Recent Channels"
          onAction={() => {
            cache.removeRecentChannel(channel.id);
            setRecentChannels(recentChannels.filter((c) => c.id !== channel.id));
            showToast(Toast.Style.Success, "Removed From Recent Channels");
          }}
          icon={{ source: Icon.XMarkCircle, tintColor: Color.PrimaryText }}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />
        <Action
          title="Clear All Recent Channels"
          onAction={() => {
            cache.clearRecentChannels();
            setRecentChannels([]);
            showToast(Toast.Style.Success, "Cleared All Recent Channels");
          }}
          icon={{ source: Icon.Trash, tintColor: Color.Red }}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
        />
      </ActionPanel.Section>
    );
  };

  return data ? (
    <ListOrGrid isLoading={isLoading} columns={griditemsize} onSearchTextChange={setSearchText} throttle={true}>
      {data.map((c) => (
        <ChannelItem key={c.id} channel={c} actions={<PinChannel channel={c} />} />
      ))}
    </ListOrGrid>
  ) : !loading ? (
    <ListOrGrid isLoading={isLoading} columns={griditemsize} onSearchTextChange={setSearchText} throttle={true}>
      {recentChannels.length === 0 && pinnedChannels.length === 0 && (
        <ListOrGridEmptyView title="No Pinned or Recent Channels" />
      )}
      <ListOrGridSection title="Pinned Channels">
        {pinnedChannels.map((c: Channel) => (
          <ChannelItem key={c.id} channel={c} actions={<PinnedChannelActions channel={c} />} />
        ))}
      </ListOrGridSection>
      {showRecentChannels && (
        <ListOrGridSection title="Recent Channels">
          {recentChannels.map((c: Channel) => (
            <ChannelItem key={c.id} channel={c} actions={<RecentChannelActions channel={c} />} />
          ))}
        </ListOrGridSection>
      )}
    </ListOrGrid>
  ) : (
    <ListOrGrid isLoading={true} />
  );
}
