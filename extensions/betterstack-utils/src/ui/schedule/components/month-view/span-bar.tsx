import { type WeekEventTimeline } from "@/domain/week-timeline";
import { formatUserName } from "@/domain/user";
import { Colors, getColor } from "@/common/colors";
import { ellipsisStyle } from "@/ui/styles";

interface SpanBarProps {
  timeline: WeekEventTimeline;
}

const VIEWPORT_WIDTH = 1160;
const TEXT_PADDING_LEFT = 12;
const TEXT_PADDING_RIGHT = 12;

export function SpanBar({ timeline }: SpanBarProps) {
  const userName = formatUserName(timeline.user);
  const color = getColor(userName);
  const startFraction = (timeline.startDayIndex + timeline.startFraction) / 7;
  const endFraction = (timeline.endDayIndex + timeline.endFraction) / 7;
  const barLeft = (startFraction + 3 / VIEWPORT_WIDTH) * 100;
  const barWidthPercentage = Math.max((endFraction - startFraction - 2 * (3 / VIEWPORT_WIDTH)) * 100, 0.2);
  const barWidth = (barWidthPercentage / 100) * VIEWPORT_WIDTH;
  const textWidth = Math.max(barWidth - TEXT_PADDING_LEFT - TEXT_PADDING_RIGHT, 0);
  const borderRadius = Math.min(6, Math.floor(barWidth / 3));
  const showUserLabel = textWidth > 8;

  return (
    <div
      tw={`flex items-center absolute left-[${barLeft}%] top-[30px] w-[${barWidthPercentage}%] h-[42px] bg-[${color}] rounded-[${borderRadius}px] overflow-hidden`}
    >
      {showUserLabel && (
        <span
          tw={`pl-[${TEXT_PADDING_LEFT}px] text-[19px] font-semibold text-[${Colors.DARK}]`}
          style={{ ...ellipsisStyle, display: "block", width: `${textWidth}px` }}
        >
          {userName}
        </span>
      )}
    </div>
  );
}
