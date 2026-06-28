import { getTextColor, Colors, RotaColors } from "../../../common/colors";
import { FONT_FAMILY } from "../../../common/font";

export const ON_CALL_PILL_CIRC_R = 16;
const CX = ON_CALL_PILL_CIRC_R;
const GAP = 13;
const PAD_LEFT = 12;
const PAD_TOP = 6;

interface OnCallPillProps {
  cy: number;
  name: string;
  color: string;
}

export function OnCallPill({ cy, name, color }: OnCallPillProps) {
  const textX = CX + ON_CALL_PILL_CIRC_R + GAP;
  const initial = name.charAt(0).toUpperCase();
  return (
    <g transform={`translate(${PAD_LEFT}, ${PAD_TOP})`}>
      <circle cx={CX} cy={cy} r={ON_CALL_PILL_CIRC_R} fill={RotaColors.GREEN} opacity="0.8">
        <animate
          attributeName="r"
          values={`${ON_CALL_PILL_CIRC_R};${ON_CALL_PILL_CIRC_R + 10};${ON_CALL_PILL_CIRC_R}`}
          dur="2s"
          repeatCount="indefinite"
        />
        <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx={CX} cy={cy} r={ON_CALL_PILL_CIRC_R} fill={color} />
      <text
        x={CX}
        y={cy}
        textAnchor="middle"
        dy="0.35em"
        fontSize={14}
        fontWeight={700}
        fill={getTextColor(color)}
        fontFamily={FONT_FAMILY}
      >
        {initial}
      </text>
      <text x={textX} y={cy} dy="0.35em" fontSize={17} fontWeight={500} fill={Colors.WHITE} fontFamily={FONT_FAMILY}>
        {`${name} is on-call`}
      </text>
    </g>
  );
}
