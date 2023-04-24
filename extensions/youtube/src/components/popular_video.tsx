import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { getErrorMessage } from "../lib/utils";
import { getPopularVideos, useRefresher, Video } from "../lib/youtubeapi";
import { VideoItem } from "./video";
import { ListOrGrid } from "./listgrid";
import { Preferences } from "../lib/types";

export function PopularVideoList() {
  const { griditemsize } = getPreferenceValues<Preferences>();
  const { data, error, isLoading } = useRefresher<Video[] | undefined>(async () => {
    return await getPopularVideos();
  }, []);
  if (error) {
    showToast(Toast.Style.Failure, "Could Not Search Popular Videos", getErrorMessage(error));
  }
  return (
    <ListOrGrid isLoading={isLoading} columns={griditemsize} aspectRatio={"4/3"}>
      {data?.map((v) => (
        <VideoItem key={v.id} video={v} />
      ))}
    </ListOrGrid>
  );
}
