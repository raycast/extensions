import {
  fontColorAccent as defFontColorAccent,
  fontColorAccentWeekend as defFontColorAccentWeekend,
  fontWeight as defFontWeight,
  fontFamily as defFontFamily,
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

export default function SVGName({
  fontColorAccent = defFontColorAccent.trim().length > 0
    ? defFontColorAccent
    : mapValueToColor(defCustomTheme) || Color.Green,
  fontColorAccentWeekend = defFontColorAccentWeekend.trim().length > 0
    ? defFontColorAccentWeekend
    : mapValueToColor(defCustomTheme) || Color.Orange,
  fontWeight = defFontWeight,
  fontFamily = defFontFamily,
  isWeekend = false,
  isToday,
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

  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" viewBox="0 0 24 24" width="60" height="60">
          <style>
            text {
              font-family: ${fontFamily ? fontFamily : "sans-serif"};
              font-weight: ${fontWeight ? fontWeight : "normal"};
              fill: ${color};
              text-anchor: middle;
            }
          </style>
        <text x="-5" y="5">
          ${weekDay}
        </text>
    </svg>
  `;
}
