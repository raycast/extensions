import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect, useState } from "react";
import { Preferences } from "../lib/types";
import { getErrorMessage } from "../lib/utils";
import { getVideos, searchVideos, useRefresher, Video } from "../lib/youtubeapi";
import { FilterDropdown } from "./dropdown";
import { ListOrGrid, ListOrGridEmptyView, ListOrGridSection } from "./listgrid";
import { getPinnedVideos, getRecentVideos } from "./recent_videos";
import { VideoItem } from "./video";

export function SearchVideoList({ channelId, searchQuery }: { channelId?: string; searchQuery?: string | undefined }) {
  const { griditemsize, showRecentVideos } = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState<string>(searchQuery || "");
  const [order, setOrder] = useCachedState<string>("search-video-order", "relevance");
  const { data, error, isLoading } = useRefresher<Video[] | undefined>(
    async () => (searchText ? await searchVideos(searchText, channelId, { order: order }) : undefined),
    [searchText, order],
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
      const pinnedVideos = await getVideos(await getPinnedVideos());
      setPinnedVideos(pinnedVideos.filter((v) => !channelId || v.channelId === channelId));
      const recentVideos = await getVideos(await getRecentVideos());
      setRecentVideos(recentVideos.filter((v) => !channelId || v.channelId === channelId));
      setLoading(false);
    })();
  }, [state]);

  return data ? (
    <ListOrGrid
      isLoading={isLoading}
      columns={griditemsize}
      searchBarAccessory={<FilterDropdown onChange={setOrder} defaultValue={order} />}
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
