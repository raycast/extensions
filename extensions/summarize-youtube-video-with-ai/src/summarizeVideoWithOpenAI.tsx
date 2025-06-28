import { List, type LaunchProps } from "@raycast/api";
import nodeFetch from "node-fetch";
import { useEffect, useState } from "react";
import { useOpenAIFollowUpQuestion } from "./components/openai/hooks/useOpenAIFollowUpQuestion";
import { useOpenAISummary } from "./components/openai/hooks/useOpenAISummary";
import SummaryDetails from "./components/summary/SummaryDetails";
import { aiService } from "./const/aiService";
import { useGetVideoUrl } from "./hooks/useGetVideoUrl";
import { useHistory } from "./hooks/useHistory";
import { type Question, useQuestions } from "./hooks/useQuestions";
import { useVideoData } from "./hooks/useVideoData";
(globalThis.fetch as typeof globalThis.fetch) = nodeFetch as never;

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
  const [videoURL, setVideoURL] = useState<string | null | undefined>(props.arguments.video);
  const { addToHistory } = useHistory();

  useGetVideoUrl({
    input: props.arguments.video || props.launchContext?.video,
    setVideoURL,
  });

  const { videoData, transcript } = useVideoData(videoURL);
  const { questions, setQuestions, question, setQuestion } = useQuestions(summary);

  useOpenAISummary({ transcript, setSummaryIsLoading, setSummary });
  useOpenAIFollowUpQuestion({
    setQuestions,
    setQuestion,
    transcript,
    question,
  });

  const [historyItem, setHistoryItem] = useState<string | null>(null);

  useEffect(() => {
    if (summary && videoData && transcript && !historyItem) {
      const item = {
        aiService: aiService,
        createdAt: new Date(),
        id: videoData.videoId,
        questions,
        summary,
        title: videoData.title,
        videoUrl: videoURL ?? "",
      };
      addToHistory(item);
      setHistoryItem(videoData.videoId);
    }
  }, [summary, videoData, transcript, addToHistory, videoURL, historyItem, questions]);

  useEffect(() => {
    if (historyItem && questions.length > 0) {
      addToHistory({
        aiService: aiService,
        createdAt: new Date(),
        id: historyItem,
        questions,
        summary: summary || "",
        title: videoData?.title || "",
        videoUrl: videoURL ?? "",
      });
    }
  }, [questions, historyItem, addToHistory, summary, videoData, videoURL]);

  if (!videoData || !transcript) return <List isLoading={true} />;

  const { thumbnail, title } = videoData;

  const markdown = summary
    ? `${summary}

![${title}](${thumbnail?.url})
  `
    : undefined;

  const handleQuestionsUpdate = (updatedQuestions: Question[]) => {
    setQuestions(updatedQuestions);
  };

  return (
    <SummaryDetails
      questions={questions}
      summary={markdown}
      summaryIsLoading={summaryIsLoading}
      transcript={transcript}
      videoData={videoData}
      onQuestionsUpdate={handleQuestionsUpdate}
    />
  );
}
