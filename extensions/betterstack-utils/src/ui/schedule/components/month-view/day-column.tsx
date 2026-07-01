import { isWeekend } from "@/common/utils/date-utils";
import { Colors, toRgba } from "@/common/colors";
import { cn } from "@/lib/utils";
import { DayLabel } from "@/ui/schedule/components/month-view/day-label";

interface DayColumnProps {
  day: Date;
  isActive: boolean;
  backgroundColor: string;
  showWeekendStripes: boolean;
}

const WEEKEND_STRIPES_IMAGE = `repeating-linear-gradient(-45deg,${toRgba(Colors.DIM, 0.5)} 0,${toRgba(Colors.DIM, 0.5)} 1px,transparent 0,transparent 50%)`;
const WEEKEND_STRIPES_SIZE = "6px 6px";

export function DayColumn(props: DayColumnProps) {
  const { day, isActive, backgroundColor, showWeekendStripes } = props;

  return (
    <div tw={`flex flex-col flex-1 relative h-[93px]`}>
      <div tw={cn("flex absolute inset-0", backgroundColor)} />
      {showWeekendStripes && <WeekendStripes isActive={isActive} date={day} />}
      {isActive && <DayLabel date={day} />}
    </div>
  );
}

function WeekendStripes({ isActive, date }: { isActive: boolean; date: Date }) {
  const opacity = isActive ? 1 : 0.3;

  return (
    <>
      {isActive && isWeekend(date) && (
        <div
          tw="flex absolute inset-x-0 top-0 h-[30px]"
          style={{ backgroundImage: WEEKEND_STRIPES_IMAGE, backgroundSize: WEEKEND_STRIPES_SIZE, opacity }}
        />
      )}
    </>
  );
}
