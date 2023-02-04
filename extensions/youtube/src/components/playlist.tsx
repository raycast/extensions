import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { getErrorMessage } from "../lib/utils";
import { getPlaylistVideos, useRefresher, Video } from "../lib/youtubeapi";
import { VideoItem } from "./video";
import { ListOrGrid } from "./list-or-grid";
import { Preferences } from "../lib/types";

const { gridColumns } = getPreferenceValues<Preferences>();

export function PlaylistList(props: { playlistId: string }) {
  const playlistId = props.playlistId;
  const { data, error, isLoading } = useRefresher<Video[] | undefined>(async () => {
    return await getPlaylistVideos(playlistId);
  }, []);
  if (error) {
    showToast(Toast.Style.Failure, "Could Not Fetch Playlist videos", getErrorMessage(error));
  }
  return (
    <ListOrGrid isLoading={isLoading} columns={gridColumns} aspectRatio={"4/3"}>
      {data?.map((v) => (
        <VideoItem key={v.id} video={v} />
      ))}
    </ListOrGrid>
  );
}
