import nodeFetch from "node-fetch";
(globalThis.fetch as typeof globalThis.fetch) = nodeFetch as never;

import { showToast, Toast, type LaunchProps } from "@raycast/api";

import { useEffect, useState } from "react";
import ytdl from "ytdl-core";
import ActionOpenAIFollowUp from "./components/openai/ActionOpenAIFollowUp";
import { useOpenAISummary } from "./components/openai/hooks/useOpenAISummary";
import SummaryDetails from "./components/SummaryDetails";
import { ALERT } from "./const/toast_messages";
import { getVideoData, type VideoDataTypes } from "./utils/getVideoData";
import { getVideoTranscript } from "./utils/getVideoTranscript";

interface SummarizeVideoWithOpenAIProps {
  video: string;
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
  }>,
) {
  const [summary, setSummary] = useState<string | undefined>();
  const [summaryIsLoading, setSummaryIsLoading] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string | undefined>();
  const [videoData, setVideoData] = useState<VideoDataTypes>();
  const { video } = props.arguments;

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
    useOpenAISummary({ transcript, setSummaryIsLoading, setSummary });
  }, [transcript]);

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
