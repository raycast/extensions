import { Action, ActionPanel, Icon, Color, showToast, Toast, Cache, getPreferenceValues } from "@raycast/api";
import { VideoActionProps } from "../lib/youtubeapi";
import { Preferences } from "../lib/types";

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

const removeRecentVideo = (id: string) => removeVideo("recent-videos", id);
const clearRecentVideos = () => cache.remove("recent-videos");
const removePinnedVideo = (id: string) => removeVideo("pinned-videos", id);
const clearPinnedVideos = () => cache.remove("pinned-videos");

export const PinVideo = ({ video, refresh }: VideoActionProps): JSX.Element => {
  return (
    <Action
      title="Pin Video"
      icon={{ source: Icon.Pin, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd"], key: "p" }}
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
      title="Remove From Pinned Videos"
      onAction={() => {
        removePinnedVideo(video.id);
        showToast(Toast.Style.Success, "Removed From Pinned Videos");
        if (refresh) refresh();
      }}
      icon={{ source: Icon.XMarkCircle, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
    />
    <Action
      title="Clear All Pinned Videos"
      onAction={() => {
        clearPinnedVideos();
        showToast(Toast.Style.Success, "Cleared All Pinned Videos");
        if (refresh) refresh();
      }}
      icon={{ source: Icon.Trash, tintColor: Color.Red }}
      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
    />
  </ActionPanel.Section>
);

export const RecentVideoActions = ({ video, refresh }: VideoActionProps) => {
  return (
    <ActionPanel.Section>
      <PinVideo video={video} refresh={refresh} />
      <Action
        title="Remove From Recent Videos"
        onAction={() => {
          removeRecentVideo(video.id);
          showToast(Toast.Style.Success, "Removed From Recent Videos");
          if (refresh) refresh();
        }}
        icon={{ source: Icon.XMarkCircle, tintColor: Color.PrimaryText }}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
      <Action
        title="Clear All Recent Videos"
        onAction={() => {
          clearRecentVideos();
          showToast(Toast.Style.Success, "Cleared All Recent Videos");
          if (refresh) refresh();
        }}
        icon={{ source: Icon.Trash, tintColor: Color.Red }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      />
    </ActionPanel.Section>
  );
};
