import { Detail } from "@raycast/api";
import type { Question } from "../../hooks/useQuestions";
import type { VideoDataTypes } from "../../utils/getVideoData";
import SummaryActions from "./SummaryActions";
import SummaryMetadata from "./SummaryMetadata";

interface SummaryDetailsProps {
  questions: Question[];
  summary: string | undefined;
  summaryIsLoading: boolean;
  transcript: string;
  videoData: VideoDataTypes;
  onQuestionsUpdate?: (updatedQuestions: Question[]) => void;
}

export default function SummaryDetails({
  summary,
  summaryIsLoading,
  transcript,
  videoData,
  questions,
  onQuestionsUpdate,
}: SummaryDetailsProps) {
  if (!summary) return null;
  const { duration, ownerChannelName, ownerProfileUrl, publishDate, title, video_url, viewCount } = videoData;

  return (
    <Detail
      actions={
        <SummaryActions
          transcript={transcript}
          summary={summary}
          video_url={video_url}
          ownerProfileUrl={ownerProfileUrl}
          questions={questions}
          onQuestionsUpdate={onQuestionsUpdate}
        />
      }
      isLoading={summaryIsLoading}
      markdown={summary}
      metadata={
        <SummaryMetadata
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
