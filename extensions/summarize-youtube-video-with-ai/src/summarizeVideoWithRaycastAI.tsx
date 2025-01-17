import nodeFetch from "node-fetch";
(globalThis.fetch as typeof globalThis.fetch) = nodeFetch as never;

import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
  type LaunchProps,
} from "@raycast/api";

import { useEffect, useState } from "react";
import ytdl from "ytdl-core";
import { ALERT } from "./const/toast_messages";
import { useFollowUpQuestion } from "./hooks/useFollowUpQuestion";
import { useGetSummary } from "./hooks/useGetSummary";
import { getVideoData, type VideoDataTypes } from "./utils/getVideoData";
import { getVideoTranscript } from "./utils/getVideoTranscript";

interface SummarizeVideoProps {
  video: string;
}
export type Preferences = {
  chosenAi: "anthropic" | "openai" | "raycastai";
  creativity: "0" | "0.5" | "1" | "1.5" | "2";
  openaiApiToken: string;
  anthropicApiToken: string;
  language: string;
  openaiEndpoint: string;
  openaiModel: string;
  anthropicModel: string;
};

const SummarizeVideo = (
  props: LaunchProps<{
    arguments: SummarizeVideoProps;
  }>,
) => {
  const [summary, setSummary] = useState<string | undefined>();
  const [summaryIsLoading, setSummaryIsLoading] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string | undefined>();
  const [videoData, setVideoData] = useState<VideoDataTypes>();
  const { pop } = useNavigation();
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
    if (transcript === undefined) return;
    useGetSummary({
      transcript,
      setSummaryIsLoading,
      setSummary,
    });
  }, [transcript]);

  const askQuestion = (question: string) => {
    if (question === undefined || transcript === undefined) return;
    useFollowUpQuestion(question, transcript, setSummary, pop);
  };

  if (!videoData) return null;
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
        <ActionPanel title="Video Actions">
          <Action.Push
            icon={Icon.QuestionMark}
            title="Ask Follow-up Question"
            target={
              <Form
                actions={
                  <ActionPanel>
                    <Action.SubmitForm title="Ask" onSubmit={({ question }) => askQuestion(question)} />
                  </ActionPanel>
                }
              >
                <Form.TextField id="question" title="Your Question" />
              </Form>
            }
          />
          <Action.CopyToClipboard title="Copy Result" content={markdown ?? ""} />
          <Action.OpenInBrowser title="Go to Video" url={video_url} />
          <Action.OpenInBrowser title="Go to Channel" url={ownerProfileUrl} />
        </ActionPanel>
      }
      isLoading={summaryIsLoading}
      markdown={markdown}
      metadata={
        videoData && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Title" text={title} />
            <Detail.Metadata.Link title="Channel" target={ownerProfileUrl} text={ownerChannelName} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Published" text={publishDate} />
            <Detail.Metadata.Label title="Duration" text={duration} />
            <Detail.Metadata.Label title="Views" text={viewCount} />
          </Detail.Metadata>
        )
      }
      navigationTitle={videoData && `${title} by ${ownerChannelName}`}
    />
  );
};

export default SummarizeVideo;
