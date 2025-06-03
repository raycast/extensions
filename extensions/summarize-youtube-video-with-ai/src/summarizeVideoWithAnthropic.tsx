import { List, type LaunchProps } from "@raycast/api";
import nodeFetch from "node-fetch";
import { useEffect, useState } from "react";
import { useAnthropicFollowUpQuestion } from "./components/anthropic/hooks/useAnthropicFollowUpQuestion";
import { useAnthropicSummary } from "./components/anthropic/hooks/useAnthropicSummary";
import SummaryDetails from "./components/summary/SummaryDetails";
import { aiService } from "./const/aiService";
import { useGetVideoUrl } from "./hooks/useGetVideoUrl";
import { useHistory } from "./hooks/useHistory";
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
  const { addToHistory } = useHistory();

  useGetVideoUrl({
    input: props.arguments.video || props.launchContext?.video,
    setVideoURL,
  });

  const { videoData, transcript } = useVideoData(videoURL);
  const { questions, setQuestions, question, setQuestion } = useQuestions(summary);

  useAnthropicSummary({ transcript, setSummaryIsLoading, setSummary });
  useAnthropicFollowUpQuestion({
    setQuestions,
    setQuestion,
    transcript,
    question,
    videoId: videoData?.videoId,
  });

  useEffect(() => {
    if (summary && videoData && questions) {
      addToHistory({
        aiService: aiService,
        createdAt: new Date(),
        id: videoData.videoId,
        questions,
        summary,
        title: videoData.title,
        videoUrl: videoURL ?? "",
      });
    }
  }, [summary, videoData, questions, addToHistory, videoURL]);

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
      summary={markdown}
      summaryIsLoading={summaryIsLoading}
      transcript={transcript}
      videoData={videoData}
    />
  );
}
