import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { Preferences } from "../lib/types";
import { getErrorMessage } from "../lib/utils";
import { getPlaylistVideos, Video } from "../lib/youtubeapi";
import { ListOrGrid } from "./listgrid";
import { VideoItem } from "./video";

export function PlaylistList(props: { playlistId: string }) {
  const { griditemsize } = getPreferenceValues<Preferences>();
  const playlistId = props.playlistId;
  const [data, setData] = useState<Video[] | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        const videos = await getPlaylistVideos(playlistId);
        setData(videos);
      } catch (error) {
        showToast(Toast.Style.Failure, "Could not fetch playlist videos", getErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    })();
  }, [playlistId]);

  return (
    <ListOrGrid isLoading={isLoading} columns={griditemsize} aspectRatio={"4/3"}>
      {data?.map((v) => (
        <VideoItem key={v.id} video={v} />
      ))}
    </ListOrGrid>
  );
}
