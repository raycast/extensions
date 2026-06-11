import {
  type SummaryEntry,
  LAYOUT,
  SUMMARY,
  summaryBlockHeight,
  formatDaysHours,
  formatMonthLabel,
} from "../../layout";
import { FONT_FAMILY } from "../../../common/font";
import { Colors } from "../../../common/colors";

interface SummaryBlockProps {
  year: number;
  month: number;
  summary: SummaryEntry[];
  offsetY: number;
}

interface VerticalItemsProps {
  summary: SummaryEntry[];
}

function VerticalSummaryItems({ summary }: VerticalItemsProps) {
  const dotRadius = 6;
  const rowHeight = SUMMARY.VERTICAL_ROW_HEIGHT;
  const paddingY = SUMMARY.VERTICAL_PADDING;
  const dotX = SUMMARY.MONTH_COL_WIDTH + 20;

  return (
    <>
      {summary.map(({ name, hours, color }, index) => {
        const cy = paddingY + index * rowHeight + rowHeight / 2;
        const textX = dotX + dotRadius + 10;
        return (
          <g key={index}>
            <circle cx={dotX} cy={cy} r={dotRadius} fill={color} />
            <text x={textX} y={cy + 5} fill={Colors.SUBTLE} fontFamily={FONT_FAMILY} fontSize={17} fontWeight={600}>
              {name}
            </text>
            <text
              x={LAYOUT.WIDTH - 24}
              y={cy + 5}
              textAnchor="end"
              fill={Colors.MUTED}
              fontFamily={FONT_FAMILY}
              fontSize={15}
            >
              {formatDaysHours(hours)}
            </text>
          </g>
        );
      })}
    </>
  );
}

export function SummaryBlock({ year, month, summary, offsetY }: SummaryBlockProps) {
  if (summary.length === 0) return null;

  const monthLabel = formatMonthLabel({ year, month });
  const count = summary.length;
  const height = summaryBlockHeight(count);
  const midY = height / 2;

  return (
    <g transform={`translate(0, ${offsetY})`}>
      <rect width={LAYOUT.WIDTH} height={height} rx={10} fill={Colors.DARK} fillOpacity={0.2} />
      <rect x={0.5} y={0.5} width={LAYOUT.WIDTH - 1} height={height - 1} rx={10} fill="none" stroke={Colors.BORDER} />
      <text x={24} y={midY + 7} fill={Colors.FROST} fontFamily={FONT_FAMILY} fontSize={18} fontWeight={700}>
        {monthLabel}
      </text>
      <line x1={SUMMARY.MONTH_COL_WIDTH} y1={16} x2={SUMMARY.MONTH_COL_WIDTH} y2={height - 16} stroke={Colors.BORDER} />
      <VerticalSummaryItems summary={summary} />
    </g>
  );
}
