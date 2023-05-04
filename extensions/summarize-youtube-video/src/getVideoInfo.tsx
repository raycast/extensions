import { usePromise } from "@raycast/utils";
import ytdl from "ytdl-core";

export default function getVideoInfo(video: string) {
  const { data: videoData } = usePromise(async () => {
    const basicVideoInformation = await ytdl.getBasicInfo(video);
    const videoDetails = basicVideoInformation.videoDetails;
    return videoDetails;
  });

  return videoData;
}
