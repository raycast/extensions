import { Action, Toast, showToast, Icon, Color, LocalStorage, getPreferenceValues } from "@raycast/api";
import React, { useState, useEffect } from "react";
import { ListOrGrid, ListOrGridSection, ListOrGridEmptyView, getViewLayout, getGridItemSize } from "./listgrid";
import { VideoItem } from "./video";
import { Video } from "../lib/youtubeapi";

const preferences = getPreferenceValues();
const { showRecentVideos } = preferences;

export const getRecentVideos = async (): Promise<Video[] | undefined> => {
  return getVideos("recent-videos");
};

export const getPinnedVideos = async (): Promise<Video[] | undefined> => {
  return getVideos("pinned-videos");
};

export const getVideos = async (key: string): Promise<Video[] | undefined> => {
  try {
    const res = await LocalStorage.getItem(key);
    if (!res) return;
    const videos = JSON.parse(res.toString());
    return videos;
  } catch {
    // ignore error
  }
  return [];
};

export const addRecentVideo = async (video: Video): Promise<void> => {
  try {
    // do not add recent channel if it is already pinned
    const pinned = await getPinnedVideos();
    if (pinned && pinned.find((v: Video) => v.id === video.id)) {
      return;
    }
    let recent = await getRecentVideos();
    if (recent) {
      recent = recent.filter((v: Video) => v.id !== video.id);
      recent.unshift(video);
      recent.splice(15);
      await LocalStorage.setItem("recent-videos", JSON.stringify(recent));
    } else {
      await LocalStorage.setItem("recent-videos", JSON.stringify([video]));
    }
  } catch {
    // ignore error
  }
};

export const addPinnedVideo = async (video: Video): Promise<void> => {
  try {
    // if in the recent channels, remove it
    removeRecentVideo(video.id);
    let pinned = await getPinnedVideos();
    if (pinned) {
      pinned = pinned.filter((v: Video) => v.id !== video.id);
      pinned.unshift(video);
      await LocalStorage.setItem("pinned-videos", JSON.stringify(pinned));
    } else {
      await LocalStorage.setItem("pinned-videos", JSON.stringify([video]));
    }
  } catch {
    // ignore error
  }
};

export function PinVideo(props: { video: Video; refresh?: boolean; setRefresh?: any }): JSX.Element | null {
  return (
    <Action
      title="Pin Video"
      icon={{ source: Icon.Pin, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd"], key: "p" }}
      onAction={async () => {
        await addPinnedVideo(props.video);
        if (props.setRefresh) props.setRefresh(!props.refresh);
        showToast(Toast.Style.Success, "Pinned Video");
      }}
    />
  );
}

export const removeVideo = async (key: string, id: string) => {
  try {
    const res = await LocalStorage.getItem(key);
    if (!res) return;
    let videos = JSON.parse(res.toString());
    videos = videos.filter((v: Video) => v.id !== id);
    await LocalStorage.setItem(key, JSON.stringify(videos));
  } catch {
    // ignore error
  }
};

export const clearRecentVideos = async (): Promise<void> => {
  await LocalStorage.removeItem("recent-videos");
};

export const removeRecentVideo = async (id: string) => {
  removeVideo("recent-videos", id);
};

export const RecentVideoActions = (props: { video: Video; refresh: boolean; setRefresh: any }): JSX.Element => {
  return (
    <React.Fragment>
      <PinVideo video={props.video} refresh={props.refresh} setRefresh={props.setRefresh} />
      <Action
        title="Remove From Recent Videos"
        onAction={async () => {
          await removeRecentVideo(props.video.id);
          props.setRefresh(!props.refresh);
          showToast(Toast.Style.Success, "Removed From Recent Videos");
        }}
        icon={{ source: Icon.XMarkCircle, tintColor: Color.PrimaryText }}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
      <Action
        title="Clear All Recent Videos"
        onAction={async () => {
          await clearRecentVideos();
          props.setRefresh(!props.refresh);
          showToast(Toast.Style.Success, "Cleared All Recent Videos");
        }}
        icon={{ source: Icon.Trash, tintColor: Color.Red }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      />
    </React.Fragment>
  );
};

export const clearPinnedVideos = async (): Promise<void> => {
  await LocalStorage.removeItem("pinned-videos");
};

export const removePinnedVideo = async (id: string) => {
  removeVideo("pinned-videos", id);
};

export const PinnedVideoActions = (props: { video: Video; refresh: boolean; setRefresh: any }): JSX.Element => {
  return (
    <React.Fragment>
      <Action
        title="Remove From Pinned Videos"
        onAction={async () => {
          await removePinnedVideo(props.video.id);
          props.setRefresh(!props.refresh);
          showToast(Toast.Style.Success, "Removed From Pinned Videos");
        }}
        icon={{ source: Icon.XMarkCircle, tintColor: Color.PrimaryText }}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
      <Action
        title="Clear All Pinned Videos"
        onAction={async () => {
          await clearPinnedVideos();
          props.setRefresh(!props.refresh);
          showToast(Toast.Style.Success, "Cleared All Pinned Videos");
        }}
        icon={{ source: Icon.Trash, tintColor: Color.Red }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      />
    </React.Fragment>
  );
};

function NoSearchView(props: { recentQueries: Video[] | undefined }): JSX.Element | null {
  const rq = props.recentQueries;
  const layout = getViewLayout();
  if (rq && rq.length > 0) {
    return null;
  } else {
    return <ListOrGridEmptyView layout={layout} title="No Pinned or Recent Videos" />;
  }
}

export function RecentVideos(props: {
  setRootSearchText: (text: string) => void;
  isLoading: boolean | undefined;
  channelId?: string | undefined;
}): JSX.Element {
  const setRootSearchText = props.setRootSearchText;
  const [pinnedVideos, setPinnedVideos] = useState<Video[] | undefined>();
  const [recentVideos, setRecentVideos] = useState<Video[] | undefined>();
  const [refresh, setRefresh] = useState(false);

  useEffect(() => {
    const getVideos = async () => {
      let pinned = await getPinnedVideos();
      if (pinned && props.channelId) {
        pinned = pinned.filter((v: Video) => v.channelId === props.channelId);
      }
      setPinnedVideos(pinned);
      let recent = await getRecentVideos();
      if (recent && props.channelId) {
        recent = recent.filter((v: Video) => v.channelId === props.channelId);
      }
      setRecentVideos(recent);
    };
    getVideos();
    return () => {
      setPinnedVideos(undefined);
      setRecentVideos(undefined);
    };
  }, [refresh]);

  const isLoading = props.isLoading;
  const layout = getViewLayout();
  const itemSize = getGridItemSize();
  if (isLoading && !pinnedVideos && !recentVideos) {
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
      <NoSearchView recentQueries={recentVideos} />
      <ListOrGridSection title="Pinned Videos" layout={layout}>
        {pinnedVideos?.map((v: Video) => (
          <VideoItem
            key={v.id}
            video={v}
            actions={<PinnedVideoActions video={v} refresh={refresh} setRefresh={setRefresh} />}
          />
        ))}
      </ListOrGridSection>
      {showRecentVideos && (
        <ListOrGridSection title="Recent Videos" layout={layout}>
          {recentVideos?.map((v: Video) => (
            <VideoItem
              key={v.id}
              video={v}
              actions={<RecentVideoActions video={v} refresh={refresh} setRefresh={setRefresh} />}
            />
          ))}
        </ListOrGridSection>
      )}
    </ListOrGrid>
  );
}
