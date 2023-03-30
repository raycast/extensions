import { Action, ActionPanel, Icon, Color, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { getErrorMessage } from "../lib/utils";
import { searchVideos, getVideos, useRefresher, Video } from "../lib/youtubeapi";
import { VideoItem } from "./video";
import { ListOrGrid, ListOrGridEmptyView, ListOrGridSection } from "./listgrid";
import * as cache from "./recent_videos";
import { Preferences } from "../lib/types";

const { griditemsize, showRecentVideos } = getPreferenceValues<Preferences>();

export function SearchVideoList({ channelId, searchQuery }: { channelId?: string; searchQuery?: string | undefined }) {
  const [searchText, setSearchText] = useState<string>(searchQuery || "");
  const { data, error, isLoading } = useRefresher<Video[] | undefined>(
    async () => (searchText ? await searchVideos(searchText, channelId) : undefined),
    [searchText]
  );
  if (error) {
    showToast(Toast.Style.Failure, "Could Not Search Videos", getErrorMessage(error));
  }
  const [loading, setLoading] = useState<boolean>(true);
  const [pinnedVideos, setPinnedVideos] = useState<Video[]>([]);
  const [recentVideos, setRecentVideos] = useState<Video[]>([]);

  useEffect(() => {
    (async () => {
      const pinnedVideos = await getVideos(cache.getPinnedVideos());
      setPinnedVideos(pinnedVideos.filter((v) => !channelId || v.channelId === channelId));
      const recentVideos = await getVideos(cache.getRecentVideos());
      setRecentVideos(recentVideos.filter((v) => !channelId || v.channelId === channelId));
      setLoading(false);
    })();
  }, []);

  const PinVideo = ({ video }: { video: Video }): JSX.Element => {
    return (
      <Action
        title="Pin Video"
        icon={{ source: Icon.Pin, tintColor: Color.PrimaryText }}
        shortcut={{ modifiers: ["cmd"], key: "p" }}
        onAction={() => {
          cache.addPinnedVideo(video);
          setRecentVideos(recentVideos.filter((v) => v.id !== video.id));
          setPinnedVideos([...pinnedVideos, video]);
          showToast(Toast.Style.Success, "Pinned Video");
        }}
      />
    );
  };
  const PinnedVideoActions = ({ video }: { video: Video }) => (
    <ActionPanel.Section>
      <Action
        title="Remove From Pinned Videos"
        onAction={() => {
          cache.removePinnedVideo(video.id);
          setPinnedVideos(pinnedVideos.filter((v) => v.id !== video.id));
          showToast(Toast.Style.Success, "Removed From Pinned Videos");
        }}
        icon={{ source: Icon.XMarkCircle, tintColor: Color.PrimaryText }}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
      <Action
        title="Clear All Pinned Videos"
        onAction={() => {
          cache.clearPinnedVideos();
          setPinnedVideos([]);
          showToast(Toast.Style.Success, "Cleared All Pinned Videos");
        }}
        icon={{ source: Icon.Trash, tintColor: Color.Red }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      />
    </ActionPanel.Section>
  );
  const RecentVideoActions = ({ video }: { video: Video }) => {
    return (
      <ActionPanel.Section>
        <PinVideo video={video} />
        <Action
          title="Remove From Recent Videos"
          onAction={() => {
            cache.removeRecentVideo(video.id);
            setRecentVideos(recentVideos.filter((v) => v.id !== video.id));
            showToast(Toast.Style.Success, "Removed From Recent Videos");
          }}
          icon={{ source: Icon.XMarkCircle, tintColor: Color.PrimaryText }}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />
        <Action
          title="Clear All Recent Videos"
          onAction={() => {
            cache.clearRecentVideos();
            setRecentVideos([]);
            showToast(Toast.Style.Success, "Cleared All Recent Videos");
          }}
          icon={{ source: Icon.Trash, tintColor: Color.Red }}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
        />
      </ActionPanel.Section>
    );
  };

  return data ? (
    <ListOrGrid
      isLoading={isLoading}
      columns={griditemsize}
      aspectRatio={"4/3"}
      onSearchTextChange={setSearchText}
      throttle={true}
    >
      {data.map((v) => (
        <VideoItem key={v.id} video={v} actions={<PinVideo video={v} />} />
      ))}
    </ListOrGrid>
  ) : !loading ? (
    <ListOrGrid
      isLoading={isLoading}
      columns={griditemsize}
      aspectRatio={"4/3"}
      onSearchTextChange={setSearchText}
      throttle={true}
    >
      {recentVideos.length === 0 && pinnedVideos.length === 0 && (
        <ListOrGridEmptyView title="No Pinned or Recent Videos" />
      )}
      <ListOrGridSection title="Pinned Videos">
        {pinnedVideos.map((v: Video) => (
          <VideoItem key={v.id} video={v} actions={<PinnedVideoActions video={v} />} />
        ))}
      </ListOrGridSection>
      {showRecentVideos && (
        <ListOrGridSection title="Recent Videos">
          {recentVideos.map((v: Video) => (
            <VideoItem key={v.id} video={v} actions={<RecentVideoActions video={v} />} />
          ))}
        </ListOrGridSection>
      )}
    </ListOrGrid>
  ) : (
    <ListOrGrid isLoading={true} />
  );
}
