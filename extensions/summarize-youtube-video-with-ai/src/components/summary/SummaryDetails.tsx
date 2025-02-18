import { Detail } from "@raycast/api";
import { VideoDataTypes } from "../../utils/getVideoData";
import SummaryActions from "./SummaryActions";
import SummaryMetadata from "./SummaryMetadata";

export type Question = {
  id: string;
  question: string;
  answer: string;
};

interface SummaryDetailsProps {
  questions: Array<{
    id: string;
    question: string;
    answer: string;
  }>;
  summary: string | undefined;
  summaryIsLoading: boolean;
  transcript: string;
  videoData: VideoDataTypes;
  onQuestionSubmit?: (question: string) => void;
}

export default function SummaryDetails({ summary, summaryIsLoading, transcript, videoData }: SummaryDetailsProps) {
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
