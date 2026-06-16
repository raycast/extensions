import { LAYOUT } from "../../../layout";
import { SKELETON_COLOR } from "../colors/skeleton-colors";

interface WeekRowProps {
  weekIndex: number;
  spans: Array<{ start: number; end: number }>;
  rowHeight: number;
}

export function WeekRow({ weekIndex, spans, rowHeight }: WeekRowProps) {
  const offsetY = LAYOUT.BLOCK_HEADER_HEIGHT + weekIndex * rowHeight;

  return (
    <>
      {weekIndex > 0 && <line x1={0} y1={offsetY} x2={LAYOUT.WIDTH} y2={offsetY} stroke={SKELETON_COLOR} />}
      {Array.from({ length: 7 }, (_, dayIndex) => {
        const x = dayIndex * LAYOUT.DAY_WIDTH;
        const center = x + LAYOUT.DAY_WIDTH / 2;
        return (
          <g key={dayIndex}>
            <line x1={x} y1={offsetY} x2={x} y2={offsetY + rowHeight} stroke={SKELETON_COLOR} />
            <line
              x1={x}
              y1={offsetY + LAYOUT.DAY_HEADER_HEIGHT}
              x2={x + LAYOUT.DAY_WIDTH}
              y2={offsetY + LAYOUT.DAY_HEADER_HEIGHT}
              stroke={SKELETON_COLOR}
            />
            <rect x={center - 24} y={offsetY + 5} width={39} height={15} fill={SKELETON_COLOR} rx={2} />
          </g>
        );
      })}
      {spans.map(({ start, end }, index) => {
        const barX = start * LAYOUT.DAY_WIDTH + LAYOUT.H_GAP;
        const barWidth = (end - start) * LAYOUT.DAY_WIDTH - 2 * LAYOUT.H_GAP;
        const barY = offsetY + LAYOUT.ROW_TOP;
        return (
          <rect
            key={index}
            x={barX}
            y={barY}
            width={barWidth}
            height={LAYOUT.ROW_HEIGHT}
            rx={6}
            fill={SKELETON_COLOR}
          />
        );
      })}
    </>
  );
}
