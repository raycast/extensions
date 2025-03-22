import { Detail } from "@raycast/api";
import { VideoDataTypes } from "../../utils/getVideoData";
import SummaryActions from "./SummaryActions";
import SummaryMetadata from "./SummaryMetadata";

type SummaryDetailsProps = {
  AskFollowUpQuestion: React.ComponentType<{
    transcript: string;
    setSummary: React.Dispatch<React.SetStateAction<string | undefined>>;
    pop: () => void;
  }>;
  markdown?: string;
  setSummary: React.Dispatch<React.SetStateAction<string | undefined>>;
  summaryIsLoading: boolean;
  transcript: string;
  videoData: VideoDataTypes;
};

export default function SummaryDetails({
  AskFollowUpQuestion,
  markdown,
  setSummary,
  summaryIsLoading,
  transcript,
  videoData,
}: SummaryDetailsProps) {
  if (!markdown) return null;
  const { duration, ownerChannelName, ownerProfileUrl, publishDate, title, video_url, viewCount } = videoData;

  return (
    <Detail
      actions={
        <SummaryActions
          transcript={transcript}
          setSummary={setSummary}
          markdown={markdown}
          video_url={video_url}
          ownerProfileUrl={ownerProfileUrl}
          AskFollowUpQuestion={AskFollowUpQuestion}
        />
      }
      isLoading={summaryIsLoading}
      markdown={markdown}
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
