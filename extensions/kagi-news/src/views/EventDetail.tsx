import { Detail } from "@raycast/api";
import { HistoricalEvent } from "../interfaces";
import { stripHtml } from "../utils";

interface EventDetailProps {
  event: HistoricalEvent;
}

export function EventDetail({ event }: EventDetailProps) {
  const markdown = `# ${event.year}\n\n${stripHtml(event.content)}`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Type" text={event.type} />
        </Detail.Metadata>
      }
    />
  );
}
