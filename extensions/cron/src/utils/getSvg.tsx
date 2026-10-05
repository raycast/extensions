import {
  fontColorAccent as defFontColorAccent,
  fontColorAccentWeekend as defFontColorAccentWeekend,
  fontWeight as defFontWeight,
  fontFamily as defFontFamily,
  monthSignal as defMonthSignal,
  customTheme as defCustomTheme,
} from "u/options";

export function mapValueToColor(value: string): string | undefined {
  switch (value) {
    case "Blue":
      return "#0A84FF";
    case "Green":
      return "#30D158";
    case "Magenta":
      return "#FF375F";
    case "Orange":
      return "#FF9F0A";
    case "Purple":
      return "#BF5AF2";
    case "Red":
      return "#FF453A";
    case "Yellow":
      return "#FFD60A";
    default:
      return undefined;
  }
}

export default function SVG({
  fontColorAccent = defFontColorAccent.trim().length > 0
    ? defFontColorAccent
    : mapValueToColor(defCustomTheme) || "#30D158",
  fontColorAccentWeekend = defFontColorAccentWeekend.trim().length > 0
    ? defFontColorAccentWeekend
    : mapValueToColor(defCustomTheme) || "#8E8E93",
  fontWeight = defFontWeight,
  fontFamily = defFontFamily,
  monthSignal = defMonthSignal,
  day,
  isWeekend = false,
  isToday,
  hasEvents,
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
    // (Color.PrimaryText / Color.SecondaryText), so the glyph adapts to
    // light/dark mode without relying on environment.appearance.
    color = "#000000";
  }

  const todayDeco = isToday
    ? `<line x1="7" y1="19.5" x2="17" y2="19.5" stroke="${color}" stroke-width="1.5" stroke-linecap="round" />`
    : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96">
    ${monthSignal && hasEvents ? `<circle cx="19" cy="5" r="1.6" fill="#33feb4" />` : ""}
    <text x="12" y="16.2" font-size="12" font-family="${fontFamily || "sans-serif"}" font-weight="${fontWeight || "normal"}" fill="${color}" text-anchor="middle">${day}</text>
    ${todayDeco}
  </svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
