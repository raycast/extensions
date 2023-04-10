import { showToast, Toast } from "@raycast/api";
import { getErrorMessage } from "../lib/utils";
import { getPopularVideos, useRefresher, Video } from "../lib/youtubeapi";
import { VideoItem } from "./video";
import { ListOrGrid, getViewLayout, getGridItemSize } from "./listgrid";
import { PinVideo } from "./recent_videos";

export function PopularVideoList() {
  const { data, error, isLoading } = useRefresher<Video[] | undefined>(async () => {
    return await getPopularVideos();
  }, []);
  if (error) {
    showToast(Toast.Style.Failure, "Could not search popular Videos", getErrorMessage(error));
  }
  const layout = getViewLayout();
  const itemSize = getGridItemSize();
  return (
    <ListOrGrid layout={layout} itemSize={itemSize} isLoading={isLoading}>
      {data?.map((v) => (
        <VideoItem key={v.id} video={v} actions={<PinVideo video={v} />} />
      ))}
    </ListOrGrid>
  );
}
