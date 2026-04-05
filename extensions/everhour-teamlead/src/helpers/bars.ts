import { Color } from "@raycast/api";
import { List } from "@raycast/api";

const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const INTENSITY_COLORS: Color[] = [
  Color.SecondaryText, // 0 - no time
  Color.Yellow, // 1 - low
  Color.Orange, // 2 - medium
  Color.Green, // 3 - good
  Color.Blue, // 4 - high
];

function hoursColor(seconds: number, maxSeconds: number): Color {
  if (seconds === 0) return INTENSITY_COLORS[0];
  const ratio = seconds / maxSeconds;
  if (ratio < 0.25) return INTENSITY_COLORS[1];
  if (ratio < 0.5) return INTENSITY_COLORS[2];
  if (ratio < 0.75) return INTENSITY_COLORS[3];
  return INTENSITY_COLORS[4];
}

function formatShort(seconds: number): string {
  if (seconds === 0) return "–";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}:${String(m).padStart(2, "0")}`;
}

export function weekDayAccessories(
  dailySeconds: Record<string, number>,
  weekDays: string[],
): List.Item.Accessory[] {
  const values = weekDays.map((d) => dailySeconds[d] ?? 0);
  const max = Math.max(...values, 1);

  return weekDays.map((d, i) => ({
    tag: {
      value: `${DAY_LABELS[i]} ${formatShort(values[i])}`,
      color: hoursColor(values[i], max),
    },
  }));
}
