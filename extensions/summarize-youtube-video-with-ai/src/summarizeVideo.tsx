import React from "react";
import { Action, ActionPanel, Detail, Toast, showToast } from "@raycast/api";
import getVideoData from "./utils/getVideoData";
import { useEffect, useState } from "react";
import type { LaunchProps } from "@raycast/api";
import type { VideoDataTypes } from "./utils/getVideoData";
import ytdl from "ytdl-core";
import getVideoTranscript from "./utils/getVideoTranscript";
import useChatGPTSummary from "./hooks/useChatGPTSummary";
import useRaycastAISummary from "./hooks/useRaycastAISummary";

interface SummarizeVideoProps {
  video: string;
}
export type PreferenceValues = {
  chosenAi: "raycastai" | "chatgpt";
  creativity: "0" | "0.5" | "1" | "1.5" | "2";
  openaiApiToken: string;
  language: string;
};

const SummarizeVideo = (props: LaunchProps<{ arguments: SummarizeVideoProps }>) => {
  const { video } = props.arguments;

  const [videoData, setVideoData] = useState<VideoDataTypes>();
  const [summary, setSummary] = useState<string | undefined>();
  const [summaryIsLoading, setSummaryIsLoading] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string | undefined>();

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
  }, [video]);

  useEffect(() => {
    if (transcript === undefined) return;
    useChatGPTSummary({ transcript, setSummaryIsLoading, setSummary });
    useRaycastAISummary({ transcript, setSummaryIsLoading, setSummary });
  }, [transcript]);

  const markdown = summary
    ? `${summary}
  
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
};

export default SummarizeVideo;
