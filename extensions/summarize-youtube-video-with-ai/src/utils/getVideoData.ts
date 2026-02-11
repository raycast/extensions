import { formatDuration } from "date-fns";
import ytdl from "ytdl-core";

export type VideoDataTypes = {
  duration: ytdl.videoInfo["videoDetails"]["lengthSeconds"];
  ownerChannelName: ytdl.videoInfo["videoDetails"]["ownerChannelName"];
  ownerProfileUrl: ytdl.videoInfo["videoDetails"]["ownerProfileUrl"];
  publishDate: ytdl.videoInfo["videoDetails"]["publishDate"];
  thumbnail: ytdl.thumbnail;
  title: ytdl.videoInfo["videoDetails"]["title"];
  video_url: ytdl.videoInfo["videoDetails"]["video_url"];
  viewCount: ytdl.videoInfo["videoDetails"]["viewCount"];
  videoId: ytdl.videoInfo["videoDetails"]["videoId"];
};

export async function getVideoData(video: string) {
  const basicVideoInformation = await ytdl.getBasicInfo(video);

  const publishDate = new Date(basicVideoInformation.videoDetails.publishDate).toLocaleDateString();
  const viewCount = Number(basicVideoInformation.videoDetails.viewCount).toLocaleString();

  const hours = Math.floor(Number(basicVideoInformation.videoDetails.lengthSeconds) / 3600);
  const minutes = Math.floor((Number(basicVideoInformation.videoDetails.lengthSeconds) % 3600) / 60);
  const duration = formatDuration({ hours, minutes }, { format: ["hours", "minutes", "seconds"] });

  const videoDetails = {
    duration,
    ownerChannelName: basicVideoInformation.videoDetails.ownerChannelName,
    ownerProfileUrl: basicVideoInformation.videoDetails.ownerProfileUrl,
    publishDate,
    thumbnail: basicVideoInformation.videoDetails.thumbnails[4],
    title: basicVideoInformation.videoDetails.title,
    video_url: basicVideoInformation.videoDetails.video_url,
    viewCount,
    videoId: basicVideoInformation.videoDetails.videoId,
  };

  return videoDetails;
}
