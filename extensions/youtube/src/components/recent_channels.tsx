import { Action, Toast, showToast, Icon, Color, LocalStorage, getPreferenceValues } from "@raycast/api";
import React, { useState, useEffect } from "react";
import { ListOrGrid, ListOrGridSection, ListOrGridEmptyView, getViewLayout, getGridItemSize } from "./listgrid";
import { ChannelItem } from "./channel";
import { Channel } from "../lib/youtubeapi";

const preferences = getPreferenceValues();
const { showRecentChannels } = preferences;

export const getRecentChannels = async (): Promise<Channel[] | undefined> => {
  return getChannels("recent-channels");
};

export const getPinnedChannels = async (): Promise<Channel[] | undefined> => {
  return getChannels("pinned-channels");
};

export const getChannels = async (key: string): Promise<Channel[] | undefined> => {
  try {
    const res = await LocalStorage.getItem(key);
    if (!res) return undefined;
    const channels = JSON.parse(res.toString());
    return channels;
  } catch {
    // ignore error
  }
  return [];
};

export const addRecentChannel = async (channel: Channel): Promise<void> => {
  try {
    // do not add recent channel if it is already pinned
    const pinned = await getPinnedChannels();
    if (pinned && pinned.find((c: Channel) => c.id === channel.id)) {
      return;
    }
    let recent = await getRecentChannels();
    if (recent) {
      recent = recent.filter((c: Channel) => c.id !== channel.id);
      recent.unshift(channel);
      recent.splice(15);
      await LocalStorage.setItem("recent-channels", JSON.stringify(recent));
    } else {
      await LocalStorage.setItem("recent-channels", JSON.stringify([channel]));
    }
  } catch {
    // ignore error
  }
};

export const addPinnedChannel = async (channel: Channel): Promise<void> => {
  try {
    // if in the recent channels, remove it
    removeRecentChannel(channel.id);
    let pinned = await getPinnedChannels();
    if (pinned) {
      pinned = pinned.filter((c: Channel) => c.id !== channel.id);
      pinned.unshift(channel);
      await LocalStorage.setItem("pinned-channels", JSON.stringify(pinned));
    } else {
      await LocalStorage.setItem("pinned-channels", JSON.stringify([channel]));
    }
  } catch {
    // ignore error
  }
};

export const PinChannel = (props: { channel: Channel; refresh?: boolean; setRefresh?: any }): JSX.Element | null => {
  return (
    <Action
      title="Pin Channel"
      icon={{ source: Icon.Pin, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd"], key: "p" }}
      onAction={async () => {
        await addPinnedChannel(props.channel);
        if (props.setRefresh) props.setRefresh(!props.refresh);
        showToast(Toast.Style.Success, "Pinned Channel");
      }}
    />
  );
};

export const removeChannel = async (key: string, id: string) => {
  try {
    const res = await LocalStorage.getItem(key);
    if (!res) return;
    let channels = JSON.parse(res.toString());
    channels = channels.filter((v: Channel) => v.id !== id);
    await LocalStorage.setItem(key, JSON.stringify(channels));
  } catch {
    // ignore error
  }
};

export const clearRecentChannels = async (): Promise<void> => {
  await LocalStorage.removeItem("recent-channels");
};

export const removeRecentChannel = async (id: string) => {
  removeChannel("recent-channels", id);
};

export const RecentChannelActions = (props: { channel: Channel; refresh: boolean; setRefresh: any }): JSX.Element => {
  return (
    <React.Fragment>
      <PinChannel channel={props.channel} refresh={props.refresh} setRefresh={props.setRefresh} />
      <Action
        title="Remove From Recent Channels"
        onAction={async () => {
          await removeRecentChannel(props.channel.id);
          props.setRefresh(!props.refresh);
          showToast(Toast.Style.Success, "Removed From Recent Channels");
        }}
        icon={{ source: Icon.XMarkCircle, tintColor: Color.PrimaryText }}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
      <Action
        title="Clear All Recent Channels"
        onAction={async () => {
          await clearRecentChannels();
          props.setRefresh(!props.refresh);
          showToast(Toast.Style.Success, "Cleared All Recent Channels");
        }}
        icon={{ source: Icon.Trash, tintColor: Color.Red }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      />
    </React.Fragment>
  );
};

export const clearPinnedChannels = async (): Promise<void> => {
  await LocalStorage.removeItem("pinned-channels");
};

export const removePinnedChannel = async (id: string) => {
  removeChannel("pinned-channels", id);
};

export const PinnedChannelActions = (props: { channel: Channel; refresh: boolean; setRefresh: any }): JSX.Element => {
  return (
    <React.Fragment>
      <Action
        title="Remove From Pinned Channels"
        onAction={async () => {
          await removePinnedChannel(props.channel.id);
          props.setRefresh(!props.refresh);
          showToast(Toast.Style.Success, "Removed From Pinned Channels");
        }}
        icon={{ source: Icon.XMarkCircle, tintColor: Color.PrimaryText }}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
      <Action
        title="Clear All Pinned Channels"
        onAction={async () => {
          await clearPinnedChannels();
          props.setRefresh(!props.refresh);
          showToast(Toast.Style.Success, "Cleared All Pinned Channels");
        }}
        icon={{ source: Icon.Trash, tintColor: Color.Red }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      />
    </React.Fragment>
  );
};

function NoSearchView(props: { recentQueries: Channel[] | undefined }): JSX.Element | null {
  const rq = props.recentQueries;
  const layout = getViewLayout();
  if (rq && rq.length > 0) {
    return null;
  } else {
    return <ListOrGridEmptyView layout={layout} title="No Pinned or Recent Channels" />;
  }
}

export function RecentChannels(props: {
  setRootSearchText: (text: string) => void;
  isLoading?: boolean | undefined;
}): JSX.Element {
  const setRootSearchText = props.setRootSearchText;
  const [pinnedChannels, setPinnedChannels] = useState<Channel[] | undefined>();
  const [recentChannels, setRecentChannels] = useState<Channel[] | undefined>();
  const [refresh, setRefresh] = useState(false);

  useEffect(() => {
    const getChannels = async () => {
      setPinnedChannels(await getPinnedChannels());
      setRecentChannels(await getRecentChannels());
    };
    getChannels();
    return () => {
      setPinnedChannels(undefined);
      setRecentChannels(undefined);
    };
  }, [refresh]);

  const isLoading = props.isLoading;
  const layout = getViewLayout();
  const itemSize = getGridItemSize();
  if (isLoading && !pinnedChannels && !recentChannels) {
    return <ListOrGrid isLoading={true} layout={layout} itemSize={itemSize} searchBarPlaceholder="Loading..." />;
  }
  return (
    <ListOrGrid
      layout={layout}
      itemSize={itemSize}
      onSearchTextChange={setRootSearchText}
      isLoading={isLoading}
      throttle={true}
    >
      <NoSearchView recentQueries={recentChannels} />
      <ListOrGridSection title="Pinned Channels" layout={layout}>
        {pinnedChannels?.map((v: Channel) => (
          <ChannelItem
            key={v.id}
            channel={v}
            actions={<PinnedChannelActions channel={v} refresh={refresh} setRefresh={setRefresh} />}
          />
        ))}
      </ListOrGridSection>
      {showRecentChannels && (
        <ListOrGridSection title="Recent Channels" layout={layout}>
          {recentChannels?.map((v: Channel) => (
            <ChannelItem
              key={v.id}
              channel={v}
              actions={<RecentChannelActions channel={v} refresh={refresh} setRefresh={setRefresh} />}
            />
          ))}
        </ListOrGridSection>
      )}
    </ListOrGrid>
  );
}
