import { activeRange, WeekData } from "@/domain/calendar-month";
import { clipTimelineToRange } from "@/domain/week-timeline";
import { isToday, type YearMonth } from "@/common/utils/date-utils";
import { DayColumn } from "@/ui/schedule/components/month-view/day-column";
import { Grid } from "@/ui/schedule/components/month-view/grid";
import { SpanBar } from "@/ui/schedule/components/month-view/span-bar";
import { CurrentTimeMarker } from "@/ui/schedule/components/month-view/current-time-marker";

interface WeekGroupProps {
  week: WeekData;
  yearMonth: YearMonth;
  showTodayMarker: boolean;
  backgroundColor: string;
  showWeekendStripes: boolean;
}

export function WeekGroup(props: WeekGroupProps) {
  const { week, yearMonth, showTodayMarker, backgroundColor, showWeekendStripes } = props;
  const range = activeRange(week.days, yearMonth);
  const clippedTimeline = clipTimelineToRange(week.timeline, range);
  const todayIndex = week.days.findIndex(isToday);
  const isTodayActive = todayIndex >= range.firstDay && todayIndex <= range.lastDay;

  return (
    <div tw={`flex relative w-full h-[93px]`}>
      {week.days.map((day, index) => (
        <DayColumn
          key={index}
          day={day}
          isActive={index >= range.firstDay && index <= range.lastDay}
          backgroundColor={backgroundColor}
          showWeekendStripes={showWeekendStripes}
        />
      ))}
      <Grid days={week.days} range={range} />
      {clippedTimeline.map((timeline, index) => (
        <SpanBar key={index} timeline={timeline} />
      ))}
      {showTodayMarker && isTodayActive && <CurrentTimeMarker index={todayIndex} />}
    </div>
  );
}
