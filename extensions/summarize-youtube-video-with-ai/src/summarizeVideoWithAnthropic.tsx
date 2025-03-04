import { List, type LaunchProps } from "@raycast/api";
import nodeFetch from "node-fetch";
import { useState } from "react";
import { useAnthropicFollowUpQuestion } from "./components/anthropic/hooks/useAnthropicFollowUpQuestion";
import { useAnthropicSummary } from "./components/anthropic/hooks/useAnthropicSummary";
import SummaryDetails from "./components/summary/SummaryDetails";
import { useGetVideoUrl } from "./hooks/useGetVideoUrl";
import { useQuestions } from "./hooks/useQuestions";
import { useVideoData } from "./hooks/useVideoData";
(globalThis.fetch as typeof globalThis.fetch) = nodeFetch as never;

interface SummarizeVideoWithAnthropicProps {
  video: string;
}
export type AnthropicPreferences = {
  creativity: "0" | "0.5" | "1" | "1.5" | "2";
  anthropicApiToken: string;
  language: string;
  anthropicModel: string;
};

export default function SummarizeVideoWithAnthropic(
  props: LaunchProps<{
    arguments: SummarizeVideoWithAnthropicProps;
    launchContext?: { video: string };
  }>,
) {
  const [summary, setSummary] = useState<string | undefined>();
  const [summaryIsLoading, setSummaryIsLoading] = useState<boolean>(false);
  const [videoURL, setVideoURL] = useState<string | null | undefined>(props.arguments.video);

  useGetVideoUrl({
    input: props.arguments.video || props.launchContext?.video,
    setVideoURL,
  });

  const { videoData, transcript } = useVideoData(videoURL);
  const { questions, setQuestions, question, setQuestion, handleAdditionalQuestion } = useQuestions(summary);

  useAnthropicSummary({ transcript, setSummaryIsLoading, setSummary });
  useAnthropicFollowUpQuestion({
    setQuestions,
    setQuestion,
    transcript,
    question,
  });

  if (!videoData || !transcript) return <List isLoading={true} />;

  const { thumbnail, title } = videoData;

  const markdown = summary
    ? `${summary}

![${title}](${thumbnail?.url})
  `
    : undefined;

  return (
    <SummaryDetails
      questions={questions}
      onQuestionSubmit={handleAdditionalQuestion}
      summary={markdown}
      summaryIsLoading={summaryIsLoading}
      transcript={transcript}
      videoData={videoData}
    />
  );
}
