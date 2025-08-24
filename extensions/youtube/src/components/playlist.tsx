import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { Preferences } from "../lib/types";
import { getErrorMessage } from "../lib/utils";
import { getPlaylistVideos, useRefresher, Video } from "../lib/youtubeapi";
import { ListOrGrid } from "./listgrid";
import { VideoItem } from "./video";

export function PlaylistList(props: { playlistId: string }) {
  const { griditemsize } = getPreferenceValues<Preferences>();
  const playlistId = props.playlistId;
  const { data, error, isLoading } = useRefresher<Video[] | undefined>(async () => {
    return await getPlaylistVideos(playlistId);
  }, []);
  if (error) {
    showToast(Toast.Style.Failure, "Could Not Fetch Playlist videos", getErrorMessage(error));
  }
  return (
    <ListOrGrid isLoading={isLoading} columns={griditemsize} aspectRatio={"4/3"}>
      {data?.map((v) => <VideoItem key={v.id} video={v} />)}
    </ListOrGrid>
  );
}
