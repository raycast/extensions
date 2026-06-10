import { type WeekSpanBar, LAYOUT, truncateLabel } from "../../layout";
import { FONT_FAMILY } from "../../../common/font";
import { getTextColor } from "../../../common/colors";

interface SpanBarProps {
  bar: WeekSpanBar;
  clipId: number;
}

export function SpanBar({ bar, clipId }: SpanBarProps) {
  const leftX = bar.startDayIndex * LAYOUT.DAY_WIDTH + bar.startFraction * LAYOUT.DAY_WIDTH;
  const rightX = bar.endDayIndex * LAYOUT.DAY_WIDTH + bar.endFraction * LAYOUT.DAY_WIDTH;
  const barX = leftX + LAYOUT.H_GAP;
  const barWidth = Math.max(rightX - leftX - 2 * LAYOUT.H_GAP, 2);
  const barY = LAYOUT.ROW_TOP + bar.lane * (LAYOUT.ROW_HEIGHT + LAYOUT.BAR_GAP);
  const id = `bar-${clipId}`;
  const textColor = getTextColor(bar.color);
  const fontSize = 19;
  const rx = Math.min(6, Math.floor(barWidth / 3));
  const textAvailWidth = barWidth - 22;
  const label = textAvailWidth > 15 ? truncateLabel(bar.label, textAvailWidth, fontSize) : "";

  return (
    <g>
      <clipPath id={id}>
        <rect x={barX + 10} y={barY} width={Math.max(barWidth - 20, 1)} height={LAYOUT.ROW_HEIGHT} />
      </clipPath>
      <rect
        x={barX}
        y={barY}
        width={barWidth}
        height={LAYOUT.ROW_HEIGHT}
        rx={rx}
        fill={bar.color}
        filter="url(#shadow)"
      />
      <rect
        x={barX + 1}
        y={barY + 1}
        width={barWidth - 2}
        height={LAYOUT.ROW_HEIGHT - 2}
        rx={Math.max(rx - 1, 0)}
        fill="none"
        stroke={textColor}
        strokeOpacity={0.16}
      />
      {label && (
        <text
          x={barX + 12}
          y={barY + 27}
          clipPath={`url(#${id})`}
          fill={textColor}
          fontFamily={FONT_FAMILY}
          fontSize={fontSize}
          fontWeight={600}
          textRendering="geometricPrecision"
        >
          {label}
        </text>
      )}
    </g>
  );
}
