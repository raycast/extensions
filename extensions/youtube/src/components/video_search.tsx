import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { getErrorMessage } from "../lib/utils";
import { searchVideos, getVideos, useRefresher, Video } from "../lib/youtubeapi";
import { VideoItem } from "./video";
import { ListOrGrid, ListOrGridEmptyView, ListOrGridSection } from "./listgrid";
import { getPinnedVideos, getRecentVideos } from "./recent_videos";
import { Preferences } from "../lib/types";

export function SearchVideoList({ channelId, searchQuery }: { channelId?: string; searchQuery?: string | undefined }) {
  const { griditemsize, showRecentVideos } = getPreferenceValues<Preferences>();
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
  const [state, setState] = useState<boolean>(false);
  const refresh = () => setState(!state);

  useEffect(() => {
    (async () => {
      const pinnedVideos = await getVideos(getPinnedVideos());
      setPinnedVideos(pinnedVideos.filter((v) => !channelId || v.channelId === channelId));
      const recentVideos = await getVideos(getRecentVideos());
      setRecentVideos(recentVideos.filter((v) => !channelId || v.channelId === channelId));
      setLoading(false);
    })();
  }, [state]);

  return data ? (
    <ListOrGrid
      isLoading={isLoading}
      columns={griditemsize}
      aspectRatio={"4/3"}
      onSearchTextChange={setSearchText}
      throttle={true}
    >
      {data.map((v) => (
        <VideoItem key={v.id} video={v} refresh={refresh} />
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
        <ListOrGridEmptyView title="Search Videos" icon="../assets/youtube.svg" />
      )}
      <ListOrGridSection title="Pinned Videos">
        {pinnedVideos.map((v: Video) => (
          <VideoItem key={v.id} video={v} refresh={refresh} pinned />
        ))}
      </ListOrGridSection>
      {showRecentVideos && (
        <ListOrGridSection title="Recent Videos">
          {recentVideos.map((v: Video) => (
            <VideoItem key={v.id} video={v} refresh={refresh} recent />
          ))}
        </ListOrGridSection>
      )}
    </ListOrGrid>
  ) : (
    <ListOrGrid isLoading={true} />
  );
}
