import { type YearMonth, formatMonth } from "@/common/utils/date-utils";
import { WeekData } from "@/domain/calendar-month";
import { Appearance, getSchedulePalette } from "@/common/colors";
import { WeekGroup } from "@/ui/schedule/components/month-view/week-group";

interface MonthBlockProps {
  weeks: WeekData[];
  yearMonth: YearMonth;
  showTodayMarker: boolean;
  backgroundColor: string;
  appearance: Appearance;
  showWeekendStripes: boolean;
}

export function MonthBlock(props: MonthBlockProps) {
  const { weeks, yearMonth, showTodayMarker, backgroundColor, appearance, showWeekendStripes } = props;
  const monthLabel = formatMonth(yearMonth);

  return (
    <div tw="flex flex-col w-[1160px]">
      <MonthLabel monthLabel={monthLabel} appearance={appearance} />
      {weeks.map((week) => (
        <WeekGroup
          key={week.id}
          week={week}
          yearMonth={yearMonth}
          showTodayMarker={showTodayMarker}
          backgroundColor={backgroundColor}
          appearance={appearance}
          showWeekendStripes={showWeekendStripes}
        />
      ))}
    </div>
  );
}

function MonthLabel(props: { monthLabel: string; appearance: Appearance }) {
  const palette = getSchedulePalette(props.appearance);

  return (
    <div tw="flex items-center justify-center h-[44px]">
      <span tw={`text-[20px] font-bold text-[${palette.heading}]`}>{props.monthLabel}</span>
    </div>
  );
}
