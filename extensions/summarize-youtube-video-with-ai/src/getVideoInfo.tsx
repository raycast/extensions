import ytdl from "ytdl-core";

export default async function getVideoInfo(video: string) {
  const basicVideoInformation = await ytdl.getBasicInfo(video);
  const videoDetails = basicVideoInformation.videoDetails;
  return videoDetails;
}
