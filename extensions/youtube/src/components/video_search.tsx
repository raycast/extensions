import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect, useState } from "react";
import { Preferences } from "../lib/types";
import { getErrorMessage } from "../lib/utils";
import { getVideos, searchVideos, useRefresher, Video } from "../lib/youtubeapi";
import { FilterDropdown } from "./dropdown";
import { ListOrGrid, ListOrGridEmptyView, ListOrGridSection } from "./listgrid";
import { getPinnedLiveVideos, getPinnedVideos, getRecentLiveVideos, getRecentVideos } from "./recent_videos";
import { VideoItem } from "./video";

export function SearchVideoList({
  channelId,
  searchQuery,
  searchOptions,
  emptyViewTitle = "Type to search videos",
  useLiveStorage = false,
}: {
  channelId?: string;
  searchQuery?: string | undefined;
  searchOptions?: { order?: string; eventType?: "live" | "completed" | "upcoming" };
  emptyViewTitle?: string;
  useLiveStorage?: boolean;
}) {
  const { griditemsize, showRecentVideos } = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState<string>(searchQuery || "");
  const [order, setOrder] = useCachedState<string>("search-video-order", "relevance");
  const { data, error, isLoading } = useRefresher<Video[] | undefined>(
    async () =>
      searchText
        ? await searchVideos(searchText, channelId, { order: order, eventType: searchOptions?.eventType })
        : undefined,
    [searchText, order],
  );
  if (error) {
    showToast(Toast.Style.Failure, "Could not search videos", getErrorMessage(error));
  }
  const [loading, setLoading] = useState<boolean>(true);
  const [pinnedVideos, setPinnedVideos] = useState<Video[]>([]);
  const [recentVideos, setRecentVideos] = useState<Video[]>([]);
  const [state, setState] = useState<boolean>(false);
  const refresh = () => setState(!state);
  const hasQuery = (searchText || "").trim().length > 0;

  useEffect(() => {
    (async () => {
      try {
        const pinnedVideos = await getVideos(await (useLiveStorage ? getPinnedLiveVideos() : getPinnedVideos()));
        setPinnedVideos(pinnedVideos.filter((v) => !channelId || v.channelId === channelId));
        const recentVideos = await getVideos(await (useLiveStorage ? getRecentLiveVideos() : getRecentVideos()));
        setRecentVideos(recentVideos.filter((v) => !channelId || v.channelId === channelId));
      } catch (error) {
        showToast(Toast.Style.Failure, "Could Not Load Recent/Pinned Videos", getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    })();
  }, [state, useLiveStorage]);

  return hasQuery ? (
    data && data.length > 0 ? (
      <ListOrGrid
        isLoading={isLoading}
        columns={griditemsize}
        searchBarAccessory={<FilterDropdown onChange={setOrder} defaultValue={order} />}
        aspectRatio={"4/3"}
        onSearchTextChange={setSearchText}
        throttle={true}
      >
        {data.map((v) => (
          <VideoItem key={v.id} video={v} refresh={refresh} useLiveStorage={useLiveStorage} />
        ))}
      </ListOrGrid>
    ) : // While searching but without results yet, keep showing the recent/pinned view
    !loading ? (
      <ListOrGrid
        isLoading={true}
        columns={griditemsize}
        aspectRatio={"4/3"}
        onSearchTextChange={setSearchText}
        throttle={true}
      >
        {recentVideos.length === 0 && pinnedVideos.length === 0 && (
          <ListOrGridEmptyView title={emptyViewTitle} icon="../assets/youtube.svg" />
        )}
        <ListOrGridSection title="Pinned Videos">
          {pinnedVideos.map((v: Video) => (
            <VideoItem key={v.id} video={v} refresh={refresh} pinned useLiveStorage={useLiveStorage} />
          ))}
        </ListOrGridSection>
        {showRecentVideos && (
          <ListOrGridSection title="Recent Videos">
            {recentVideos.map((v: Video) => (
              <VideoItem key={v.id} video={v} refresh={refresh} recent useLiveStorage={useLiveStorage} />
            ))}
          </ListOrGridSection>
        )}
      </ListOrGrid>
    ) : (
      <ListOrGrid isLoading={true} />
    )
  ) : !loading ? (
    <ListOrGrid
      isLoading={false}
      columns={griditemsize}
      aspectRatio={"4/3"}
      onSearchTextChange={setSearchText}
      throttle={true}
    >
      {recentVideos.length === 0 && pinnedVideos.length === 0 && (
        <ListOrGridEmptyView title={emptyViewTitle} icon="../assets/youtube.svg" />
      )}
      <ListOrGridSection title="Pinned Videos">
        {pinnedVideos.map((v: Video) => (
          <VideoItem key={v.id} video={v} refresh={refresh} pinned useLiveStorage={useLiveStorage} />
        ))}
      </ListOrGridSection>
      {showRecentVideos && (
        <ListOrGridSection title="Recent Videos">
          {recentVideos.map((v: Video) => (
            <VideoItem key={v.id} video={v} refresh={refresh} recent useLiveStorage={useLiveStorage} />
          ))}
        </ListOrGridSection>
      )}
    </ListOrGrid>
  ) : (
    <ListOrGrid isLoading={true} />
  );
}
