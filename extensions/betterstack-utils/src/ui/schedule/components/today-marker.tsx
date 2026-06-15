import { Colors } from "../../../common/colors";
import { LAYOUT } from "../../layout";

interface TodayMarkerProps {
  index: number;
  today: Date;
  rowHeight: number;
}

export function TodayMarker({ index, today, rowHeight }: TodayMarkerProps) {
  const fraction = (today.getHours() * 60 + today.getMinutes()) / (24 * 60);
  const x = index * LAYOUT.DAY_WIDTH + fraction * LAYOUT.DAY_WIDTH;

  return (
    <g>
      <line
        x1={x}
        y1={LAYOUT.DAY_HEADER_HEIGHT}
        x2={x}
        y2={rowHeight}
        stroke={Colors.WHITE}
        strokeWidth={4}
        opacity={0.85}
      />
      <circle cx={x} cy={LAYOUT.DAY_HEADER_HEIGHT} r={3} fill={Colors.WHITE} />
    </g>
  );
}
