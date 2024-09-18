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
import { VideoActionProps } from "./video";

const { griditemsize } = getPreferenceValues<Preferences>();

const cache = new Cache();

export const getRecentVideos = () => getCachedVideos("recent-videos");
export const getPinnedVideos = () => getCachedVideos("pinned-videos");

const getCachedVideos = (key: string): string[] => {
  const videos = cache.get(key);
  return videos ? JSON.parse(videos) : [];
};

export const addRecentVideo = (videoId: string) => {
  removePinnedVideo(videoId);
  const recent = getRecentVideos().filter((id) => id !== videoId);
  recent.unshift(videoId);
  recent.splice(griditemsize * 2);
  cache.set("recent-videos", JSON.stringify(recent));
};

export const addPinnedVideo = (videoId: string) => {
  removeRecentVideo(videoId);
  const pinned = getPinnedVideos().filter((id) => id !== videoId);
  pinned.unshift(videoId);
  cache.set("pinned-videos", JSON.stringify(pinned));
};

const removeVideo = (key: string, id: string) => {
  const videos = getCachedVideos(key);
  cache.set(key, JSON.stringify(videos.filter((v) => v !== id)));
};

const removePinnedVideo = (id: string) => removeVideo("pinned-videos", id);
const clearPinnedVideos = () => cache.remove("pinned-videos");
const removeRecentVideo = (id: string) => removeVideo("recent-videos", id);
const clearRecentVideos = () => cache.remove("recent-videos");

const handleClearRecentVideos = async (refresh?: () => void) => {
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
    clearRecentVideos();
    showToast(Toast.Style.Success, "Cleared All Recent Videos");
    if (refresh) refresh();
  }
};

export const PinVideo = ({ video, refresh }: VideoActionProps): JSX.Element => {
  return (
    <Action
      title="Pin Video"
      icon={{ source: Icon.Pin, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
      onAction={() => {
        addPinnedVideo(video.id);
        showToast(Toast.Style.Success, "Pinned Video");
        if (refresh) refresh();
      }}
    />
  );
};

export const PinnedVideoActions = ({ video, refresh }: VideoActionProps) => (
  <ActionPanel.Section>
    <Action
      title="Remove from Pinned Videos"
      onAction={() => {
        removePinnedVideo(video.id);
        showToast(Toast.Style.Success, "Removed from Pinned Videos");
        if (refresh) refresh();
      }}
      icon={Icon.XMarkCircle}
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
    />
    <Action
      title="Clear All Pinned Videos"
      onAction={() => {
        clearPinnedVideos();
        showToast(Toast.Style.Success, "Cleared All Pinned Videos");
        if (refresh) refresh();
      }}
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
    />
  </ActionPanel.Section>
);

export const RecentVideoActions = ({ video, refresh }: VideoActionProps) => {
  return (
    <ActionPanel.Section>
      <PinVideo video={video} refresh={refresh} />
      <Action
        title="Remove from Recent Videos"
        onAction={() => {
          removeRecentVideo(video.id);
          showToast(Toast.Style.Success, "Removed from Recent Videos");
          if (refresh) refresh();
        }}
        icon={Icon.XMarkCircle}
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["ctrl"], key: "x" }}
      />
      <Action
        title="Clear All Recent Videos"
        onAction={() => handleClearRecentVideos(refresh)}
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
      />
    </ActionPanel.Section>
  );
};
