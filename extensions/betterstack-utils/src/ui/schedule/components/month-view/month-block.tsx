import { type YearMonth, formatMonth } from "@/common/utils/date-utils";
import { WeekData } from "@/domain/calendar-month";
import { WeekGroup } from "@/ui/schedule/components/month-view/week-group";

interface MonthBlockProps {
  weeks: WeekData[];
  yearMonth: YearMonth;
  showTodayMarker: boolean;
  backgroundColor: string;
  showWeekendStripes: boolean;
}

export function MonthBlock(props: MonthBlockProps) {
  const { weeks, yearMonth, showTodayMarker, backgroundColor, showWeekendStripes } = props;
  const monthLabel = formatMonth(yearMonth);

  return (
    <div tw="flex flex-col w-[1160px]">
      <MonthLabel monthLabel={monthLabel} />
      {weeks.map((week) => (
        <WeekGroup
          key={week.id}
          week={week}
          yearMonth={yearMonth}
          showTodayMarker={showTodayMarker}
          backgroundColor={backgroundColor}
          showWeekendStripes={showWeekendStripes}
        />
      ))}
    </div>
  );
}

function MonthLabel(props: { monthLabel: string }) {
  return (
    <div tw="flex items-center justify-center h-[44px]">
      <span tw="text-[20px] font-bold text-frost">{props.monthLabel}</span>
    </div>
  );
}
