import { Action, ActionPanel, Detail, Toast, showToast } from "@raycast/api";
import getAiSummary from "./getAiSummary";
import getVideoInfo from "./getVideoInfo";
import type { LaunchProps } from "@raycast/api";
import ytdl from "ytdl-core";
import { useState } from "react";
import { formatDuration } from "date-fns";

interface VideoSummaryProps {
  video: string;
}

export default function VideoSummary(props: LaunchProps<{ arguments: VideoSummaryProps }>) {
  const [summary, setSummary] = useState<string | undefined>(undefined);
  const [summaryIsLoading, setSummaryIsLoading] = useState<boolean>(false);
  const { video } = props.arguments;

  if (!ytdl.validateURL(video) && !ytdl.validateID(video)) {
    showToast({
      style: Toast.Style.Failure,
      title: "Invalid URL/ID",
      message: "The passed URL/ID is invalid, please check your input.",
    });
    return;
  }

  const videoData = getVideoInfo(video);
  const publishDate = videoData && new Date(videoData.publishDate).toLocaleDateString();
  const viewCount = videoData && Number(videoData.viewCount).toLocaleString();

  const hours = Math.floor(Number(videoData?.lengthSeconds) / 3600);
  const minutes = Math.floor((Number(videoData?.lengthSeconds) % 3600) / 60);
  const duration = formatDuration({ hours, minutes }, { format: ["hours", "minutes", "seconds"] });

  const summaryData = getAiSummary(video, videoData?.title);
  summaryData.then((result) => {
    setSummary(result.summary);
    setSummaryIsLoading(result.summaryIsLoading);
  });

  const markdown = summary
    ? `${summary}
  
  <img src="${videoData?.thumbnails[3].url}">
  `
    : `<img src="${videoData?.thumbnails[3].url}">`;

  return (
    <Detail
      actions={
        videoData && (
          <ActionPanel title="Video Actions">
            <Action.OpenInBrowser title="Go to Video" url={videoData.video_url} />
            <Action.OpenInBrowser title="Go to Channel" url={videoData.ownerProfileUrl} />
          </ActionPanel>
        )
      }
      isLoading={summaryIsLoading}
      markdown={markdown}
      metadata={
        videoData && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Title" text={videoData.title} />
            <Detail.Metadata.Link
              title="Channel"
              target={videoData.ownerProfileUrl}
              text={videoData.ownerChannelName}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Published" text={publishDate} />
            <Detail.Metadata.Label title="Duration" text={duration} />
            <Detail.Metadata.Label title="Views" text={viewCount} />
          </Detail.Metadata>
        )
      }
      navigationTitle={videoData && `${videoData.title} by ${videoData.ownerChannelName}`}
    />
  );
}
