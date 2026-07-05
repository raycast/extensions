import { OnCallEvent } from "@/domain/on-call-event";
import { fractionOfDayElapsed, isToday, today } from "@/common/utils/date-utils";
import { Appearance } from "@/common/colors";
import { DayColumn } from "@/ui/schedule/components/week-view/day-column";

interface WeekBlockProps {
  days: Date[];
  events: OnCallEvent[];
  appearance: Appearance;
}

export function WeekBlock({ days, events, appearance }: WeekBlockProps) {
  const todayIndex = days.findIndex(isToday);

  return (
    <div tw="flex flex-1">
      {days.map((day, dayIndex) => {
        const additionalProps = dayIndex === todayIndex ? { markerTime: fractionOfDayElapsed(today()) } : {};

        return (
          <DayColumn
            key={`day-${dayIndex}`}
            events={events}
            day={day}
            dayIndex={dayIndex}
            isToday={dayIndex === todayIndex}
            appearance={appearance}
            {...additionalProps}
          />
        );
      })}
    </div>
  );
}
