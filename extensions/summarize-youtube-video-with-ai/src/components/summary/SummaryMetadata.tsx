import { Detail } from "@raycast/api";
import { aiService } from "../../const/aiService";

type SummaryMetadataProps = {
  duration: string;
  ownerChannelName: string;
  ownerProfileUrl: string;
  publishDate: string;
  title: string;
  viewCount: string;
};

export default function SummaryMetadata({
  duration,
  ownerChannelName,
  ownerProfileUrl,
  publishDate,
  title,
  viewCount,
}: SummaryMetadataProps) {
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Title" text={title} />
      <Detail.Metadata.Link title="Channel" target={ownerProfileUrl} text={ownerChannelName} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="Published" text={publishDate} />
      <Detail.Metadata.Label title="Duration" text={duration} />
      <Detail.Metadata.Label title="Views" text={viewCount} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="AI Model" text={aiService} />
    </Detail.Metadata>
  );
}
