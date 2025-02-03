import nodeFetch from "node-fetch";
(globalThis.fetch as typeof globalThis.fetch) = nodeFetch as never;

import { showToast, Toast, type LaunchProps } from "@raycast/api";
import { useEffect, useState } from "react";
import ActionOpenAIFollowUp from "./components/openai/ActionOpenAIFollowUp";
import { useOpenAISummary } from "./components/openai/hooks/useOpenAISummary";
import SummaryDetails from "./components/summary/SummaryDetails";
import { ALERT } from "./const/toast_messages";
import { useGetVideoUrl } from "./hooks/useGetVideoUrl";
import { getVideoData, type VideoDataTypes } from "./utils/getVideoData";
import { getVideoTranscript } from "./utils/getVideoTranscript";

interface SummarizeVideoWithOpenAIProps {
  video: string | undefined | null;
}
export type OpenAIPreferences = {
  creativity: "0" | "0.5" | "1" | "1.5" | "2";
  openaiApiToken: string;
  language: string;
  openaiEndpoint: string;
  openaiModel: string;
};

export default function SummarizeVideoWithOpenAI(
  props: LaunchProps<{
    arguments: SummarizeVideoWithOpenAIProps;
    launchContext?: { video: string };
  }>,
) {
  const [summary, setSummary] = useState<string | undefined>();
  const [summaryIsLoading, setSummaryIsLoading] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string | undefined>();
  const [videoData, setVideoData] = useState<VideoDataTypes>();
  const [videoURL, setVideoURL] = useState<string | null | undefined>(props.arguments.video);

  useGetVideoUrl({ input: props.arguments.video || props.launchContext?.video, setVideoURL }).then((url) =>
    setVideoURL(url),
  );

  useEffect(() => {
    if (!videoURL) return;
    getVideoData(videoURL)
      .then(setVideoData)
      .catch((error) => {
        showToast({
          style: Toast.Style.Failure,
          title: ALERT.title,
          message: "Error fetching video data: " + error.message,
        });
      });
    getVideoTranscript(videoURL)
      .then(setTranscript)
      .catch((error) => {
        showToast({
          style: Toast.Style.Failure,
          title: ALERT.title,
          message: "Error fetching video transcript: " + error.message,
        });
      });
  }, [videoURL]);

  useOpenAISummary({ transcript, setSummaryIsLoading, setSummary });

  if (!videoData || !transcript) return null;
  const { thumbnail, title } = videoData;

  const markdown = summary
    ? `${summary}

![${title}](${thumbnail?.url})
  `
    : undefined;

  return (
    <SummaryDetails
      AskFollowUpQuestion={ActionOpenAIFollowUp}
      markdown={markdown}
      setSummary={setSummary}
      summaryIsLoading={summaryIsLoading}
      transcript={transcript}
      videoData={videoData}
    />
  );
}
