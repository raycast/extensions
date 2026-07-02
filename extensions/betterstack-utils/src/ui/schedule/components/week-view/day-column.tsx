import { rangeOf } from "@/common/utils/collection-utils";
import { formatWeekday } from "@/common/utils/date-utils";
import { OnCallEvent } from "@/domain/on-call-event";
import { cn } from "@/lib/utils";
import { DayEvents } from "@/ui/schedule/components/week-view/day-events";
import { CurrentTimeMarker } from "@/ui/schedule/components/week-view/current-time-marker";

interface DayColumnProps {
  day: Date;
  dayIndex: number;
  isToday: boolean;
  events: OnCallEvent[];
  markerTime?: number;
}

export function DayColumn({ day, dayIndex, isToday, events, markerTime }: DayColumnProps) {
  const opacity = isToday ? 1 : 0.75;

  return (
    <div tw="flex flex-col flex-1 relative">
      {isToday && <div tw="flex absolute top-0 left-0 right-0 h-[44px] rounded-[6px] bg-deep-dark opacity-50" />}
      <div tw="flex items-center justify-center h-[44px]" style={{ gap: "4px" }}>
        <span tw="text-[14px] font-semibold text-white" style={{ opacity }}>{`${formatWeekday(day)} `}</span>
        <span tw="text-[14px] pl-2 font-semibold text-white" style={{ opacity }}>
          {`${day.getDate()}/${day.getMonth() + 1}`}
        </span>
      </div>
      <div tw={cn("flex relative h-[456px]", { "border-l border-slate": dayIndex > 0 })}>
        {rangeOf(24).map((hourIndex) => (
          <div key={`hour-${hourIndex}`} tw={`flex absolute left-0 right-0 top-[${hourIndex * 19}px] h-px bg-slate`} />
        ))}
        <DayEvents events={events} day={day} />
        {markerTime !== undefined && <CurrentTimeMarker markerTime={markerTime} />}
      </div>
    </div>
  );
}
