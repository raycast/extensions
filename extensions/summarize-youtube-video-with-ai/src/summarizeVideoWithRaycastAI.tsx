import nodeFetch from "node-fetch";
(globalThis.fetch as typeof globalThis.fetch) = nodeFetch as never;

import { Detail, showToast, Toast, useNavigation, type LaunchProps } from "@raycast/api";

import { useEffect, useState } from "react";
import ytdl from "ytdl-core";
import ActionRaycastFollowUp from "./components/raycast/ActionRaycastFollowUp";
import { useRaycastAISummary } from "./components/raycast/hooks/useRaycastAISummary";
import SummaryActions from "./components/SummaryActions";
import SummaryDetails from "./components/SummaryMetadata";
import { ALERT } from "./const/toast_messages";
import { getVideoData, type VideoDataTypes } from "./utils/getVideoData";
import { getVideoTranscript } from "./utils/getVideoTranscript";

interface SummarizeVideoWithRaycastAIProps {
  video: string;
}
export type RaycastAIPreferences = {
  creativity: "0" | "0.5" | "1" | "1.5" | "2";
  language: string;
};

export default function SummarizeVideoWithRaycastAI(
  props: LaunchProps<{
    arguments: SummarizeVideoWithRaycastAIProps;
  }>,
) {
  const [summary, setSummary] = useState<string | undefined>();
  const [summaryIsLoading, setSummaryIsLoading] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string | undefined>();
  const [videoData, setVideoData] = useState<VideoDataTypes>();
  const { video } = props.arguments;
  const { pop } = useNavigation();

  if (!ytdl.validateURL(video) && !ytdl.validateID(video)) {
    showToast({
      style: Toast.Style.Failure,
      title: "Invalid URL/ID",
      message: "The passed URL/ID is invalid, please check your input.",
    });
    return null;
  }

  useEffect(() => {
    getVideoData(video)
      .then(setVideoData)
      .catch((error) => {
        showToast({
          style: Toast.Style.Failure,
          title: ALERT.title,
          message: "Error fetching video data: " + error.message,
        });
      });
    getVideoTranscript(video)
      .then(setTranscript)
      .catch((error) => {
        showToast({
          style: Toast.Style.Failure,
          title: ALERT.title,
          message: "Error fetching video transcript: " + error.message,
        });
      });
  }, [video]);

  useEffect(() => {
    useRaycastAISummary({ transcript, setSummaryIsLoading, setSummary });
  }, [transcript]);

  if (!videoData || !transcript) return null;
  const { duration, ownerChannelName, ownerProfileUrl, publishDate, thumbnail, title, video_url, viewCount } =
    videoData;

  const markdown = summary
    ? `${summary}

![${title}](${thumbnail?.url})
  `
    : undefined;

  return (
    <Detail
      actions={
        <SummaryActions
          transcript={transcript}
          setSummary={setSummary}
          markdown={markdown}
          video_url={video_url}
          ownerProfileUrl={ownerProfileUrl}
          AskFollowUpQuestion={<ActionRaycastFollowUp transcript={transcript} setSummary={setSummary} pop={pop} />}
        />
      }
      isLoading={summaryIsLoading}
      markdown={markdown}
      metadata={
        <SummaryDetails
          title={title}
          ownerChannelName={ownerChannelName}
          ownerProfileUrl={ownerProfileUrl}
          publishDate={publishDate}
          duration={duration}
          viewCount={viewCount}
        />
      }
      navigationTitle={videoData && `${title} by ${ownerChannelName}`}
    />
  );
}
