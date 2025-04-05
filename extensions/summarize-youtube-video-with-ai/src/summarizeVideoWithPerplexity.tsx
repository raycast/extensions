import { List, type LaunchProps } from "@raycast/api";
import nodeFetch from "node-fetch";
import { useState } from "react";
import { usePerplexityFollowUpQuestion } from "./components/perplexity/hooks/usePerplexityFollowUpQuestion";
import { usePerplexitySummary } from "./components/perplexity/hooks/usePerplexitySummary";
import SummaryDetails from "./components/summary/SummaryDetails";
import { useGetVideoUrl } from "./hooks/useGetVideoUrl";
import { useQuestions } from "./hooks/useQuestions";
import { useVideoData } from "./hooks/useVideoData";
(globalThis.fetch as typeof globalThis.fetch) = nodeFetch as never;

interface SummarizeVideoWithPerplexityProps {
  video: string;
}

export type PerplexityPreferences = {
  creativity: "0" | "0.5" | "1" | "1.5" | "2";
  perplexityApiToken: string;
  language: string;
  perplexityModel: string;
};

export default function SummarizeVideoWithPerplexity(
  props: LaunchProps<{
    arguments: SummarizeVideoWithPerplexityProps;
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

  usePerplexitySummary({ transcript, setSummaryIsLoading, setSummary });
  usePerplexityFollowUpQuestion({
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
