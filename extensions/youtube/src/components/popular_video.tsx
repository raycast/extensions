import { List, showToast, Toast } from "@raycast/api";
import { getErrorMessage } from "../lib/utils";
import { getPopularVideos, useRefresher, Video } from "../lib/youtubeapi";
import { VideoListItem } from "./video";

export function PopularVideoList() {
  const { data, error, isLoading } = useRefresher<Video[] | undefined>(async () => {
    return await getPopularVideos();
  }, []);
  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Could not search popular Videos",
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
