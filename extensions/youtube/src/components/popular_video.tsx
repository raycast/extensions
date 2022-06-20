import { Grid, showToast, Toast } from "@raycast/api";
import { getErrorMessage } from "../lib/utils";
import { getPopularVideos, useRefresher, Video } from "../lib/youtubeapi";
import { VideoItem } from "./video";
import { getViewLayout, ListOrGrid } from "./listgrid";

export function PopularVideoList() {
  const { data, error, isLoading } = useRefresher<Video[] | undefined>(async () => {
    return await getPopularVideos();
  }, []);
  if (error) {
    showToast(Toast.Style.Failure, "Could not search popular Videos", getErrorMessage(error));
  }
  return (
    <ListOrGrid layout={getViewLayout()} isLoading={isLoading}>
      {data?.map((v) => (
        <VideoItem key={v.id} video={v} />
      ))}
    </ListOrGrid>
  );
}
