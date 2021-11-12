import { List, showToast, ToastStyle } from "@raycast/api";
import { getErrorMessage } from "../lib/utils";
import { getPopularVideos, useRefresher, Video } from "../lib/youtubeapi";
import { VideoListItem } from "./video";

export function PopularVideoList() {
  const { data, error, isLoading } = useRefresher<Video[] | undefined>(async () => {
    return await getPopularVideos();
  }, []);
  if (error) {
    showToast(ToastStyle.Failure, "Could not search popular Videos", getErrorMessage(error));
  }
  return (
    <List isLoading={isLoading}>
      {data?.map((v) => (
        <VideoListItem key={v.id} video={v} />
      ))}
    </List>
  );
}
