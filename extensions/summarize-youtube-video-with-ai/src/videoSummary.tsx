import { Action, ActionPanel, Detail, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { formatDuration } from "date-fns";
import { useState } from "react";
import getChatGPTSummary from "./getChatGPTSummary";
import getVideoInfo from "./getVideoInfo";
import getVideoTranscript from "./getVideoTranscript";
import type { LaunchProps } from "@raycast/api";
import ytdl from "ytdl-core";

interface VideoSummaryProps {
  video: string;
}

export default function VideoSummary(props: LaunchProps<{ arguments: VideoSummaryProps }>) {
  const preferences = getPreferenceValues();

  const [transcript, setTranscript] = useState<string | undefined>(undefined);
  const [transcriptIsLoading, setTranscriptIsLoading] = useState<boolean>(false);
  const [content, setContent] = useState<string | undefined>(undefined);
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

  getVideoTranscript(video).then((result) => {
    setTranscriptIsLoading(result.transcriptLoading);
    setTranscript(result.rawTranscript);
  });

  if (preferences.chosenAi === "chatgpt") {
    getChatGPTSummary({ videoTitle: videoData?.title, transcript, transcriptIsLoading }).then((result) => {
      setSummaryIsLoading(result.summaryIsLoading);
      setContent(result.summary);
    });
  }

  if (preferences.chosenAi === "raycastai") {
    console.log("preferencenes.chosenAI", preferences.chosenAi);
  }

  const markdown = content
    ? `${content}
  
  <img src="${videoData?.thumbnails[3].url}">
  `
    : undefined;

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
      isLoading={transcriptIsLoading || summaryIsLoading}
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
