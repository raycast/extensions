import {
  fontColorAccent as defFontColorAccent,
  fontColorAccentWeekend as defFontColorAccentWeekend,
  fontWeight as defFontWeight,
  fontFamily as defFontFamily,
  monthSignal as defMonthSignal,
  customTheme as defCustomTheme,
} from "u/options";
import { Color, environment } from "@raycast/api";

function mapValueToColor(value: string): Color | undefined {
  switch (value) {
    case "Blue":
      return Color.Blue;
    case "Green":
      return Color.Green;
    case "Magenta":
      return Color.Magenta;
    case "Orange":
      return Color.Orange;
    case "Purple":
      return Color.Purple;
    case "Red":
      return Color.Red;
    case "Yellow":
      return Color.Yellow;
    case "Default":
    default:
      return undefined;
  }
}

export default function SVG({
  fontColorAccent = defFontColorAccent.trim().length > 0
    ? defFontColorAccent
    : mapValueToColor(defCustomTheme) || Color.Green,
  fontColorAccentWeekend = defFontColorAccentWeekend.trim().length > 0
    ? defFontColorAccentWeekend
    : mapValueToColor(defCustomTheme) || Color.SecondaryText,
  fontWeight = defFontWeight,
  fontFamily = defFontFamily,
  monthSignal = defMonthSignal,
  day,
  isWeekend = false,
  isToday,
  hasEvents,
  weekDay,
}: {
  fontWeight?: string;
  fontFamily?: string;
  fontColorAccent?: string;
  fontColorAccentWeekend?: string;
  isWeekend?: boolean;
  monthSignal?: boolean;
  day?: number | string;
  isToday?: boolean;
  hasEvents?: boolean;
  weekDay?: string;
}) {
  let color;

  if (isToday) {
    color = fontColorAccent || mapValueToColor(defCustomTheme) || Color.PrimaryText;
  } else if (isWeekend) {
    color = fontColorAccentWeekend || mapValueToColor(defCustomTheme) || Color.SecondaryText;
  } else if (weekDay) {
    color = Color.SecondaryText;
  } else {
    color = environment.appearance === "light" ? "#000000" : "#ffffff";
  }

  const todayDeco = isToday ? `<line x1="-8" y1="6" x2="8" y2="6" />` : "";

  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" viewBox="0 0 24 24">
          <style>
            text {
              font-family: ${fontFamily ? fontFamily : "sans-serif"};
              font-weight: ${fontWeight ? fontWeight : "normal"};
              font-size: inherit;
              fill: ${color};
              text-transform: uppercase;
              text-anchor: middle;
            }
            circle {
              position: absolute;
            }
            line {
              stroke: ${color};
              stroke-width: 2;
              stroke-linecap: round;
              opacity: 1;
              position: absolute;
              display: none;
            }
          </style>
        <g>
          ${monthSignal && hasEvents ? `<circle cx="12" cy="-8" r="1" fill="#33feb4" />` : ""}
          <text>
            <tspan x="50%" y="50%">${day}</tspan>
          </text>
        </g>
        ${todayDeco}
    </svg>
  `;
}
