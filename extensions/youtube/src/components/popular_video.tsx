import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { Preferences } from "../lib/types";
import { getErrorMessage } from "../lib/utils";
import { getPopularVideos, Video } from "../lib/youtubeapi";
import { ListOrGrid } from "./listgrid";
import { VideoItem } from "./video";

export function PopularVideoList() {
  const { griditemsize } = getPreferenceValues<Preferences>();
  const [data, setData] = useState<Video[] | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        const videos = await getPopularVideos();
        setData(videos);
      } catch (error) {
        showToast(Toast.Style.Failure, "Could not search popular videos", getErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return (
    <ListOrGrid isLoading={isLoading} columns={griditemsize} aspectRatio={"4/3"}>
      {data?.map((v) => (
        <VideoItem key={v.id} video={v} />
      ))}
    </ListOrGrid>
  );
}
