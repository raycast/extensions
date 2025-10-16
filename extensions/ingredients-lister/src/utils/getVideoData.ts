import ytdl from "ytdl-core";

export type VideoDataTypes = {
  ownerChannelName: ytdl.videoInfo["videoDetails"]["ownerChannelName"];
  title: ytdl.videoInfo["videoDetails"]["title"];
};

async function getVideoData(video: string) {
  const basicVideoInformation = await ytdl.getBasicInfo(video);

  const videoDetails = {
    ownerChannelName: basicVideoInformation.videoDetails.ownerChannelName,
    title: basicVideoInformation.videoDetails.title,
  };

  return videoDetails;
}

export default getVideoData;
