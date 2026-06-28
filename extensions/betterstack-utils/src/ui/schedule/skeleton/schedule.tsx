import { renderToStaticMarkup } from "react-dom/server";
import { LAYOUT, SUMMARY, weekRowHeight, summaryBlockHeight } from "../../layout";
import { ON_CALL_PILL_CIRC_R } from "../components/on-call-pill";
import { WeekRow } from "./components/week-row";
import { SKELETON_COLOR } from "./colors/skeleton-colors";

const ON_CALL_PILL_BANNER = ON_CALL_PILL_CIRC_R * 2;

const NUM_WEEKS = 5;
const NUM_SUMMARY = 3;

const WEEK_BAR_SPANS = [
  [{ start: 0, end: 7 }],
  [{ start: 0, end: 7 }],
  [{ start: 0, end: 7 }],
  [{ start: 0, end: 7 }],
  [{ start: 0, end: 7 }],
];

function ScheduleSkeletonSvg() {
  const rowHeight = weekRowHeight(1);
  const calendarHeight = LAYOUT.BLOCK_HEADER_HEIGHT + NUM_WEEKS * rowHeight;
  const summaryHeight = summaryBlockHeight(NUM_SUMMARY);
  const totalHeight = ON_CALL_PILL_BANNER + calendarHeight + LAYOUT.SUMMARY_GAP + summaryHeight;
  const calendarOffsetY = ON_CALL_PILL_BANNER;
  const summaryOffsetY = ON_CALL_PILL_BANNER + calendarHeight + LAYOUT.SUMMARY_GAP;
  const summaryMidY = summaryHeight / 2;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={LAYOUT.WIDTH}
      height={totalHeight}
      viewBox={`0 0 ${LAYOUT.WIDTH} ${totalHeight}`}
    >
      <g transform={`translate(0, ${calendarOffsetY})`}>
        <rect width={LAYOUT.WIDTH} height={calendarHeight} rx={10} fill={SKELETON_COLOR} fillOpacity={0.2} />
        <rect
          x={0.5}
          y={0.5}
          width={LAYOUT.WIDTH - 1}
          height={calendarHeight - 1}
          rx={10}
          fill="none"
          stroke={SKELETON_COLOR}
        />
        <rect x={LAYOUT.WIDTH / 2 - 80} y={13} width={160} height={18} fill={SKELETON_COLOR} rx={4} />
        <line
          x1={0}
          y1={LAYOUT.BLOCK_HEADER_HEIGHT}
          x2={LAYOUT.WIDTH}
          y2={LAYOUT.BLOCK_HEADER_HEIGHT}
          stroke={SKELETON_COLOR}
        />
        {Array.from({ length: NUM_WEEKS }, (_, weekIndex) => (
          <WeekRow key={weekIndex} weekIndex={weekIndex} spans={WEEK_BAR_SPANS[weekIndex]} rowHeight={rowHeight} />
        ))}
      </g>
      <g transform={`translate(0, ${summaryOffsetY})`}>
        <rect width={LAYOUT.WIDTH} height={summaryHeight} rx={10} fill={SKELETON_COLOR} fillOpacity={0.2} />
        <rect
          x={0.5}
          y={0.5}
          width={LAYOUT.WIDTH - 1}
          height={summaryHeight - 1}
          rx={10}
          fill="none"
          stroke={SKELETON_COLOR}
        />
        <rect x={24} y={summaryMidY - 5} width={90} height={14} fill={SKELETON_COLOR} rx={3} />
        <line
          x1={SUMMARY.MONTH_COL_WIDTH}
          y1={16}
          x2={SUMMARY.MONTH_COL_WIDTH}
          y2={summaryHeight - 16}
          stroke={SKELETON_COLOR}
        />
      </g>
    </svg>
  );
}

export function buildScheduleSkeletonSvg(): string {
  return renderToStaticMarkup(<ScheduleSkeletonSvg />);
}
