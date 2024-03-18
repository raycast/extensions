import {
  Action,
  ActionPanel,
  Alert,
  Cache,
  Color,
  Icon,
  Toast,
  confirmAlert,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { Preferences } from "../lib/types";
import { ChannelActionProps } from "./actions";

const { griditemsize } = getPreferenceValues<Preferences>();

const cache = new Cache();

export const getRecentChannels = () => getCachedChannels("recent-channels");
export const getPinnedChannels = () => getCachedChannels("pinned-channels");

const getCachedChannels = (key: string): string[] => {
  const channels = cache.get(key);
  return channels ? JSON.parse(channels) : [];
};

export const addRecentChannel = (channelId: string) => {
  removePinnedChannel(channelId);
  const recent = getRecentChannels().filter((id) => id !== channelId);
  recent.unshift(channelId);
  recent.splice(griditemsize * 2);
  cache.set("recent-channels", JSON.stringify(recent));
};

const addPinnedChannel = (channelId: string) => {
  removeRecentChannel(channelId);
  const pinned = getPinnedChannels().filter((id) => id !== channelId);
  pinned.unshift(channelId);
  cache.set("pinned-channels", JSON.stringify(pinned));
};

const removeChannel = (key: string, id: string) => {
  const channels = getCachedChannels(key);
  cache.set(key, JSON.stringify(channels.filter((c) => c !== id)));
};

const removePinnedChannel = (id: string) => removeChannel("pinned-channels", id);
const clearPinnedChannels = () => cache.remove("pinned-channels");
const removeRecentChannel = (id: string) => removeChannel("recent-channels", id);
const clearRecentChannels = () => cache.remove("recent-channels");

const handleClearRecentChannels = async (refresh?: () => void) => {
  const confirmed = await confirmAlert({
    title: "Clear all recent videos?",
    icon: Icon.Trash,
    message: "This action cannot be undone.",
    primaryAction: {
      title: "Clear All",
      style: Alert.ActionStyle.Destructive,
    },
  });

  if (confirmed) {
    clearRecentChannels();
    showToast(Toast.Style.Success, "Cleared All Recent Channels");
    if (refresh) refresh();
  }
};

export const PinChannel = ({ channelId, refresh }: ChannelActionProps): JSX.Element => {
  return (
    <Action
      title="Pin Channel"
      icon={{ source: Icon.Pin, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
      onAction={() => {
        addPinnedChannel(channelId);
        showToast(Toast.Style.Success, "Pinned Channel");
        if (refresh) refresh();
      }}
    />
  );
};

export const PinnedChannelActions = ({ channelId, refresh }: ChannelActionProps) => (
  <ActionPanel.Section>
    <Action
      title="Remove from Pinned Channels"
      onAction={() => {
        removePinnedChannel(channelId);
        showToast(Toast.Style.Success, "Removed from Pinned Channels");
        if (refresh) refresh();
      }}
      icon={Icon.XMarkCircle}
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
    />
    <Action
      title="Clear All Pinned Channels"
      onAction={() => {
        clearPinnedChannels();
        showToast(Toast.Style.Success, "Cleared All Pinned Channels");
        if (refresh) refresh();
      }}
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
    />
  </ActionPanel.Section>
);

export const RecentChannelActions = ({ channelId, refresh }: ChannelActionProps) => {
  return (
    <ActionPanel.Section>
      <PinChannel channelId={channelId} refresh={refresh} />
      <Action
        title="Remove from Recent Channels"
        onAction={() => {
          removeRecentChannel(channelId);
          showToast(Toast.Style.Success, "Removed from Recent Channels");
          if (refresh) refresh();
        }}
        icon={Icon.XMarkCircle}
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["ctrl"], key: "x" }}
      />
      <Action
        title="Clear All Recent Channels"
        onAction={() => handleClearRecentChannels(refresh)}
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
      />
    </ActionPanel.Section>
  );
};
