import { type WeekSpanBar, LAYOUT, formatMonthLabel } from "../../layout";
import { FONT_FAMILY } from "../../../common/font";
import { Colors } from "../../../common/colors";
import { WeekGroup } from "./week-group";

interface MonthBlockProps {
  weeks: Date[][];
  blockOffsetY: number;
  blockHeight: number;
  today: Date;
  weekTimelines: WeekSpanBar[][];
  currentMonth: { year: number; month: number };
  showTodayMarker: boolean;
  columnBg: string;
  weekRowHeights: number[];
}

export function MonthBlock({
  weeks,
  blockOffsetY,
  blockHeight,
  today,
  weekTimelines,
  currentMonth,
  showTodayMarker,
  columnBg,
  weekRowHeights,
}: MonthBlockProps) {
  const monthLabel = formatMonthLabel(currentMonth);

  return (
    <g transform={`translate(0, ${blockOffsetY})`}>
      <text
        x={LAYOUT.WIDTH / 2}
        y={LAYOUT.BLOCK_HEADER_HEIGHT / 2 + 7}
        textAnchor="middle"
        fill={Colors.FROST}
        fontFamily={FONT_FAMILY}
        fontSize={17}
        fontWeight={700}
      >
        {monthLabel}
      </text>
      <line x1={0.5} y1={LAYOUT.BLOCK_HEADER_HEIGHT} x2={0.5} y2={blockHeight} stroke={Colors.BORDER} />
      <line
        x1={LAYOUT.WIDTH - 0.5}
        y1={LAYOUT.BLOCK_HEADER_HEIGHT}
        x2={LAYOUT.WIDTH - 0.5}
        y2={blockHeight}
        stroke={Colors.BORDER}
      />
      <line
        x1={0}
        y1={LAYOUT.BLOCK_HEADER_HEIGHT}
        x2={LAYOUT.WIDTH}
        y2={LAYOUT.BLOCK_HEADER_HEIGHT}
        stroke={Colors.BORDER}
      />
      {weeks.map((days, localIndex) => {
        const rowHeight = weekRowHeights[localIndex];
        const offsetY = LAYOUT.BLOCK_HEADER_HEIGHT + weekRowHeights.slice(0, localIndex).reduce((a, b) => a + b, 0);
        const baseId = (currentMonth.year * 12 + currentMonth.month) * 1000 + localIndex * 100;
        return (
          <WeekGroup
            key={localIndex}
            days={days}
            weekTimeline={weekTimelines[localIndex]}
            today={today}
            weekIndex={localIndex}
            offsetY={offsetY}
            currentMonth={currentMonth}
            showTodayMarker={showTodayMarker}
            columnBg={columnBg}
            rowHeight={rowHeight}
            baseId={baseId}
          />
        );
      })}
    </g>
  );
}
