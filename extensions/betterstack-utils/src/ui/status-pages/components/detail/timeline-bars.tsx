import { Appearance } from "@/common/colors";
import { StatusHistoryDay } from "@/domain/status-page-resource";
import { RESOURCE_STATUS_COLOR } from "@/ui/status-pages/status-colors";

const TIMELINE_WIDTH = 1112;
const BAR_HEIGHT = 32;
const BAR_GAP = 2;

interface TimelineBarsProps {
  history: StatusHistoryDay[];
  appearance: Appearance;
}

export function TimelineBars({ history, appearance }: TimelineBarsProps) {
  const barWidth = history.length > 0 ? TIMELINE_WIDTH / history.length - BAR_GAP : 0;

  return (
    <div tw={`flex items-center h-[${BAR_HEIGHT}px]`} style={{ gap: `${BAR_GAP}px` }}>
      {history.map((day) => {
        const color = RESOURCE_STATUS_COLOR[day.status][appearance];
        return (
          <div
            key={day.day}
            tw={`flex h-[${BAR_HEIGHT}px] rounded-[2px] bg-[${color}]`}
            style={{ width: `${barWidth}px` }}
          />
        );
      })}
    </div>
  );
}
