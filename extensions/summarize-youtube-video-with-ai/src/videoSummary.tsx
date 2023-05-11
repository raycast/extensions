import { Action, ActionPanel, Detail, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { getVideoData } from "./getVideoData";
import { useEffect, useState } from "react";
import getChatGPTSummary from "./getChatGPTSummary";
import getRaycatsAISummary from "./getRaycastAISummary";
import getVideoTranscript from "./getVideoTranscript";
import type { LaunchProps } from "@raycast/api";
import type { VideoDataTypes } from "./getVideoData";
import ytdl from "ytdl-core";

interface VideoSummaryProps {
  video: string;
}

export default function VideoSummary(props: LaunchProps<{ arguments: VideoSummaryProps }>) {
  const preferences = getPreferenceValues();

  const [videoData, setVideoData] = useState<VideoDataTypes>();
  const [transcript, setTranscript] = useState<string | undefined>(undefined);
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

  useEffect(() => {
    getVideoData(video).then(setVideoData);
    getVideoTranscript(video).then(setTranscript);
    return () => {
      setVideoData(undefined);
      setTranscript(undefined);
    };
  }, []);

  if (preferences.chosenAi === "chatgpt") {
    getChatGPTSummary({ videoTitle: videoData?.title, transcript }).then((result) => {
      setSummaryIsLoading(result.summaryIsLoading);
      setContent(result.summary);
    });
  }

  if (preferences.chosenAi === "raycastai") {
    getRaycatsAISummary({ videoTitle: videoData?.title, transcript }).then((result) => {
      setSummaryIsLoading(result.summaryIsLoading);
      setContent(result.summary);
    });
  }

  const markdown = content
    ? `${content}
  
  <img src="${videoData?.thumbnail}">
  `
    : undefined;

  return (
    <Detail
      actions={
        videoData && (
          <ActionPanel title="Video Actions">
            <Action.CopyToClipboard title="Copy Summary" content={markdown ?? ""} />
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
            <Detail.Metadata.Label title="Published" text={videoData.publishDate} />
            <Detail.Metadata.Label title="Duration" text={videoData.duration} />
            <Detail.Metadata.Label title="Views" text={videoData.viewCount} />
          </Detail.Metadata>
        )
      }
      navigationTitle={videoData && `${videoData.title} by ${videoData.ownerChannelName}`}
    />
  );
}
