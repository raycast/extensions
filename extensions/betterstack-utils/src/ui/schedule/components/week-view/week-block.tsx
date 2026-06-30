import { OnCallEvent } from "@/domain/on-call-event";
import { fractionOfDayElapsed, isToday, today } from "@/common/utils/date-utils";
import { DayColumn } from "@/ui/schedule/components/week-view/day-column";

export function WeekBlock({ days, events }: { days: Date[]; events: OnCallEvent[] }) {
  const todayIndex = days.findIndex(isToday);

  return (
    <div tw="flex w-[1160px]">
      {days.map((day, dayIndex) => {
        const additionalProps = dayIndex === todayIndex ? { markerTime: fractionOfDayElapsed(today()) } : {};

        return (
          <DayColumn
            key={`day-${dayIndex}`}
            events={events}
            day={day}
            dayIndex={dayIndex}
            isToday={dayIndex === todayIndex}
            {...additionalProps}
          />
        );
      })}
    </div>
  );
}
