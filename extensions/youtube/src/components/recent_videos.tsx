import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  LocalStorage,
  Toast,
  confirmAlert,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { Preferences } from "../lib/types";
import { VideoActionProps } from "./video";

const { griditemsize } = getPreferenceValues<Preferences>();

export const getRecentVideos = () => getLocalStorageVideos("recent-videos");
export const getPinnedVideos = () => getLocalStorageVideos("pinned-videos");
export const getRecentLiveVideos = () => getLocalStorageVideos("recent-live-videos");
export const getPinnedLiveVideos = () => getLocalStorageVideos("pinned-live-videos");

const getLocalStorageVideos = async (key: string): Promise<string[]> => {
  const videos = (await LocalStorage.getItem(key)) as string;
  return videos ? JSON.parse(videos) : [];
};

export const addRecentVideo = async (videoId: string) => {
  const recent = await getRecentVideos();
  const filterRecent = recent.filter((id) => id !== videoId);
  filterRecent.unshift(videoId);
  filterRecent.splice(griditemsize * 2);
  await LocalStorage.setItem("recent-videos", JSON.stringify(filterRecent));
};

export const addRecentLiveVideo = async (videoId: string) => {
  const recent = await getRecentLiveVideos();
  const filterRecent = recent.filter((id) => id !== videoId);
  filterRecent.unshift(videoId);
  filterRecent.splice(griditemsize * 2);
  await LocalStorage.setItem("recent-live-videos", JSON.stringify(filterRecent));
};

export const addPinnedVideo = async (videoId: string) => {
  const pinned = await getPinnedVideos();
  const filterPinned = pinned.filter((id) => id !== videoId);
  filterPinned.unshift(videoId);
  await LocalStorage.setItem("pinned-videos", JSON.stringify(filterPinned));
};

export const addPinnedLiveVideo = async (videoId: string) => {
  const pinned = await getPinnedLiveVideos();
  const filterPinned = pinned.filter((id) => id !== videoId);
  filterPinned.unshift(videoId);
  await LocalStorage.setItem("pinned-live-videos", JSON.stringify(filterPinned));
};

const removeVideo = async (key: string, id: string) => {
  const videos = await getLocalStorageVideos(key);
  await LocalStorage.setItem(key, JSON.stringify(videos.filter((v) => v !== id)));
};

const removePinnedVideo = (id: string) => removeVideo("pinned-videos", id);
const removePinnedLiveVideo = (id: string) => removeVideo("pinned-live-videos", id);
const clearPinnedVideos = () => LocalStorage.removeItem("pinned-videos");
const clearPinnedLiveVideos = () => LocalStorage.removeItem("pinned-live-videos");
const removeRecentVideo = (id: string) => removeVideo("recent-videos", id);
const removeRecentLiveVideo = (id: string) => removeVideo("recent-live-videos", id);
const clearRecentVideos = () => LocalStorage.removeItem("recent-videos");
const clearRecentLiveVideos = () => LocalStorage.removeItem("recent-live-videos");

const handleClearRecentVideos = async (refresh?: () => void, useLiveStorage?: boolean) => {
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
    if (useLiveStorage) {
      clearRecentLiveVideos();
    } else {
      clearRecentVideos();
    }
    showToast(Toast.Style.Success, "Cleared all Recent Videos");
    if (refresh) refresh();
  }
};

export const PinVideo = ({ video, refresh, useLiveStorage }: VideoActionProps) => {
  return (
    <Action
      title="Pin Video"
      icon={{ source: Icon.Pin, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
      onAction={() => {
        if (useLiveStorage) {
          addPinnedLiveVideo(video.id);
        } else {
          addPinnedVideo(video.id);
        }
        showToast(Toast.Style.Success, "Pinned Video");
        if (refresh) refresh();
      }}
    />
  );
};

export const PinnedVideoActions = ({ video, refresh, useLiveStorage }: VideoActionProps) => (
  <ActionPanel.Section>
    <Action
      title="Remove from Pinned Videos"
      onAction={() => {
        if (useLiveStorage) {
          removePinnedLiveVideo(video.id);
        } else {
          removePinnedVideo(video.id);
        }
        showToast(Toast.Style.Success, "Removed from Pinned Videos");
        if (refresh) refresh();
      }}
      icon={Icon.PinDisabled}
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
    />
    <Action
      title="Clear All Pinned Videos"
      onAction={() => {
        if (useLiveStorage) {
          clearPinnedLiveVideos();
        } else {
          clearPinnedVideos();
        }
        showToast(Toast.Style.Success, "Cleared all Pinned Videos");
        if (refresh) refresh();
      }}
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
    />
  </ActionPanel.Section>
);

export const RecentVideoActions = ({ video, refresh, useLiveStorage }: VideoActionProps) => {
  return (
    <ActionPanel.Section>
      <PinVideo video={video} refresh={refresh} useLiveStorage={useLiveStorage} />
      <Action
        title="Remove from Recent Videos"
        onAction={() => {
          if (useLiveStorage) {
            removeRecentLiveVideo(video.id);
          } else {
            removeRecentVideo(video.id);
          }
          showToast(Toast.Style.Success, "Removed from Recent Videos");
          if (refresh) refresh();
        }}
        icon={Icon.XMarkCircle}
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["ctrl"], key: "x" }}
      />
      <Action
        title="Clear All Recent Videos"
        onAction={() => handleClearRecentVideos(refresh, useLiveStorage)}
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
      />
    </ActionPanel.Section>
  );
};
