import { type WeekSpanBar, LAYOUT } from "../../layout";
import { isSameDay } from "../../../common/dates";
import { Colors } from "../../../common/colors";
import { DayColumn } from "./day-column";
import { SpanBar } from "./span-bar";
import { TodayMarker } from "./today-marker";

interface WeekGroupProps {
  days: Date[];
  weekTimeline: WeekSpanBar[];
  today: Date;
  weekIndex: number;
  offsetY: number;
  currentMonth: { year: number; month: number };
  showTodayMarker: boolean;
  columnBg: string;
  rowHeight: number;
  baseId: number;
}

export function WeekGroup({
  days,
  weekTimeline,
  today,
  weekIndex,
  offsetY,
  currentMonth,
  showTodayMarker,
  columnBg,
  rowHeight,
  baseId,
}: WeekGroupProps) {
  const todayIndex = days.findIndex((day) => isSameDay(day, today));

  return (
    <g transform={`translate(0, ${offsetY})`}>
      {weekIndex > 0 && <line x1={0} y1={0} x2={LAYOUT.WIDTH} y2={0} stroke={Colors.BORDER} />}
      {days.map((day, index) => (
        <DayColumn
          key={index}
          day={day}
          index={index}
          currentMonth={currentMonth}
          columnBg={columnBg}
          rowHeight={rowHeight}
        />
      ))}
      {weekTimeline.map((bar, index) => (
        <SpanBar key={index} bar={bar} clipId={baseId + index} />
      ))}
      {showTodayMarker && todayIndex >= 0 && <TodayMarker index={todayIndex} today={today} rowHeight={rowHeight} />}
    </g>
  );
}
