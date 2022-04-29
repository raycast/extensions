import { showToast, List, Toast } from "@raycast/api";
import { getErrorMessage } from "../lib/utils";
import { getPlaylistVideos, useRefresher, Video } from "../lib/youtubeapi";
import { VideoListItem } from "./video";

export function PlaylistList(props: { playlistId: string }) {
  const playlistId = props.playlistId;
  const { data, error, isLoading } = useRefresher<Video[] | undefined>(async () => {
    return await getPlaylistVideos(playlistId);
  }, []);
  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Could not fetch playlist videos",
      message: getErrorMessage(error),
    });
  }
  return (
    <List isLoading={isLoading}>
      {data?.map((v) => (
        <VideoListItem key={v.id} video={v} />
      ))}
    </List>
  );
}
