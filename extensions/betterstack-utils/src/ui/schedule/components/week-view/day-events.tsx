import { getColor } from "@/common/colors";
import { DAY_MS } from "@/common/utils/date-utils";
import { OnCallEvent } from "@/domain/on-call-event";
import { formatUserName } from "@/domain/user";
import { DaySegment, EventSegment } from "@/ui/schedule/components/week-view/event-segment";

export interface DayEventsProps {
  events: OnCallEvent[];
  day: Date;
}

export function DayEvents({ events, day }: DayEventsProps) {
  const segments = getDaySegments(events, day);
  return (
    <div tw="flex absolute top-0 left-0 right-0 bottom-0">
      {segments.map((segment, segmentIndex) => (
        <EventSegment key={`segment-${segmentIndex}`} segment={segment} />
      ))}
    </div>
  );
}

function getDaySegments(events: OnCallEvent[], dayStart: Date): DaySegment[] {
  const dayStartMs = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate()).getTime();
  const dayEndMs = dayStartMs + DAY_MS;

  return events.flatMap((event) => {
    const eventStart = new Date(event.startedAt).getTime();
    const eventEnd = new Date(event.endedAt).getTime();
    const segmentStart = Math.max(eventStart, dayStartMs);
    const segmentEnd = Math.min(eventEnd, dayEndMs);
    if (segmentEnd <= segmentStart) return [];

    const userName = formatUserName(event.user);
    const color = getColor(userName);

    return [
      {
        startFraction: (segmentStart - dayStartMs) / DAY_MS,
        endFraction: (segmentEnd - dayStartMs) / DAY_MS,
        label: userName,
        color,
      },
    ];
  });
}
