import {
  fontColorAccent as defFontColorAccent,
  fontColorAccentWeekend as defFontColorAccentWeekend,
  fontWeight as defFontWeight,
  fontFamily as defFontFamily,
  customTheme as defCustomTheme,
} from "u/options";
import { mapValueToColor } from "u/getSvg";

export default function SVGName({
  fontColorAccent = defFontColorAccent.trim().length > 0
    ? defFontColorAccent
    : mapValueToColor(defCustomTheme) || "#30D158",
  fontColorAccentWeekend = defFontColorAccentWeekend.trim().length > 0
    ? defFontColorAccentWeekend
    : mapValueToColor(defCustomTheme) || "#FF9F0A",
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
    color = fontColorAccent;
  } else if (isWeekend) {
    color = fontColorAccentWeekend;
  } else {
    // Plain black placeholder; the Grid.Item applies a theme-aware tintColor
    // (Color.SecondaryText), so the label adapts to light/dark mode.
    color = "#000000";
  }

  const label = (weekDay ?? "").toString();
  // Shrink long labels (e.g. month names in the week column header) to fit the 24-unit canvas
  const fontSize = Math.min(8, 22 / Math.max(1, label.length * 0.62));
  const baselineY = 12 + fontSize * 0.35;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96">
    <text x="12" y="${baselineY}" font-size="${fontSize}" font-family="${fontFamily || "sans-serif"}" font-weight="${fontWeight || "normal"}" fill="${color}" text-anchor="middle">${label}</text>
  </svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
