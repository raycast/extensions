import { isWeekend } from "@/common/utils/date-utils";
import { Appearance, Colors } from "@/common/colors";
import { cn } from "@/lib/utils";
import { DayLabel } from "@/ui/schedule/components/month-view/day-label";

interface DayColumnProps {
  day: Date;
  isActive: boolean;
  backgroundColor: string;
  appearance: Appearance;
  showWeekendStripes: boolean;
}

export function DayColumn(props: DayColumnProps) {
  const { day, isActive, backgroundColor, appearance, showWeekendStripes } = props;

  return (
    <div tw={`flex flex-col flex-1 relative h-[93px]`}>
      <div tw={cn("flex absolute inset-0", backgroundColor)} />
      {showWeekendStripes && <WeekendStripes isActive={isActive} date={day} />}
      {isActive && <DayLabel date={day} appearance={appearance} />}
    </div>
  );
}

function WeekendStripes({ isActive, date }: { isActive: boolean; date: Date }) {
  const opacity = isActive ? 1 : 0.3;

  return (
    <>
      {isActive && isWeekend(date) && (
        <div tw={`flex absolute inset-x-0 top-0 h-[30px] bg-[${Colors.STRIPE_MARKER}]`} style={{ opacity }} />
      )}
    </>
  );
}
