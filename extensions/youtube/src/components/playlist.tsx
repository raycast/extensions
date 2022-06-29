import { showToast, Toast } from "@raycast/api";
import { getErrorMessage } from "../lib/utils";
import { getPlaylistVideos, useRefresher, Video } from "../lib/youtubeapi";
import { VideoItem } from "./video";
import { ListOrGrid, getViewLayout, getGridItemSize } from "./listgrid";

export function PlaylistList(props: { playlistId: string }) {
  const playlistId = props.playlistId;
  const { data, error, isLoading } = useRefresher<Video[] | undefined>(async () => {
    return await getPlaylistVideos(playlistId);
  }, []);
  if (error) {
    showToast(Toast.Style.Failure, "Could not fetch playlist videos", getErrorMessage(error));
  }
  const layout = getViewLayout();
  const itemSize = getGridItemSize();
  return (
    <ListOrGrid layout={layout} itemSize={itemSize} isLoading={isLoading}>
      {data?.map((v) => (
        <VideoItem key={v.id} video={v} />
      ))}
    </ListOrGrid>
  );
}
