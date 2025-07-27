import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  Toast,
  confirmAlert,
  getPreferenceValues,
  showToast,
  LocalStorage,
} from "@raycast/api";
import { Preferences } from "../lib/types";
import { ChannelActionProps } from "./actions";

const { griditemsize } = getPreferenceValues<Preferences>();

export const getRecentChannels = () => getLocalStorageChannels("recent-channels");
export const getPinnedChannels = () => getLocalStorageChannels("pinned-channels");

const getLocalStorageChannels = async (key: string): Promise<string[]> => {
  const channels = (await LocalStorage.getItem(key)) as string;
  return channels ? JSON.parse(channels) : [];
};

export const addRecentChannel = async (channelId: string) => {
  const recent = await getRecentChannels();
  const filterRecent = recent.filter((id) => id !== channelId);
  filterRecent.unshift(channelId);
  filterRecent.splice(griditemsize * 2);
  await LocalStorage.setItem("recent-channels", JSON.stringify(filterRecent));
};

const addPinnedChannel = async (channelId: string) => {
  const pinned = await getPinnedChannels();
  const filteredPinned = pinned.filter((id) => id !== channelId);
  filteredPinned.unshift(channelId);
  await LocalStorage.setItem("pinned-channels", JSON.stringify(filteredPinned));
};

const removeChannel = async (key: string, id: string) => {
  const channels = await getLocalStorageChannels(key);
  await LocalStorage.setItem(key, JSON.stringify(channels.filter((c) => c !== id)));
};

const removePinnedChannel = (id: string) => removeChannel("pinned-channels", id);
const clearPinnedChannels = async () => await LocalStorage.removeItem("pinned-channels");
const removeRecentChannel = (id: string) => removeChannel("recent-channels", id);
const clearRecentChannels = async () => await LocalStorage.removeItem("recent-channels");

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
