import { Detail } from "@raycast/api";
import { Event } from "../types";

interface EventDetailProps {
  event: Event;
}

export function EventDetail({ event }: EventDetailProps) {
  return (
    <Detail
      markdown={event.content || "*No notes yet*"}
      navigationTitle={event.name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Event" text={event.name} />
          <Detail.Metadata.Label title="Start" text={event.startDate} />
          <Detail.Metadata.Label title="End" text={event.endDate} />
        </Detail.Metadata>
      }
    />
  );
}
