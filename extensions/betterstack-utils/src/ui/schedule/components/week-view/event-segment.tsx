import { Colors } from "@/common/colors";
import { ellipsisStyle } from "@/ui/styles";

export interface DaySegment {
  startFraction: number;
  endFraction: number;
  label: string;
  color: string;
}

interface EventSegmentProps {
  segment: DaySegment;
}

export function EventSegment({ segment }: EventSegmentProps) {
  const topPercent = segment.startFraction * 100;
  const height = Math.max(12, (segment.endFraction - segment.startFraction) * 456);
  const showName = height >= 24;

  return (
    <div
      tw={`flex items-start absolute left-[2px] right-[2px] top-[${topPercent}%] h-[${height}px] bg-[${segment.color}] rounded-[3px] overflow-hidden`}
    >
      {showName && (
        <span
          tw={`w-full pt-[4px] pl-[12px] pr-[6px] text-[16px] font-semibold text-[${Colors.DARK}]`}
          style={ellipsisStyle}
        >
          {segment.label}
        </span>
      )}
    </div>
  );
}
