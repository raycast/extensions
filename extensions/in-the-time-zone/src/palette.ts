export type HourType = "work" | "sleep" | "marginal";

export function getHourType(hour: number): HourType {
  // Sleep: 10PM-6AM, work: 9AM-5PM, marginal: 6AM-9AM and 5PM-10PM
  if (hour >= 22 || hour < 6) return "sleep";
  if (hour >= 9 && hour < 17) return "work";
  return "marginal";
}

export interface CellColors {
  fill: string;
  text: string;
}

export interface TimelinePalette {
  cells: Record<HourType, CellColors>;
  dayStart: CellColors;
  text: string;
  muted: string;
  accent: string;
  cursorText: string;
  now: string;
  badgeGmt: string;
  badgeDelta: string;
}

export const LIGHT_PALETTE: TimelinePalette = {
  cells: {
    sleep: { fill: "#5b6cdb", text: "#ffffff" },
    marginal: { fill: "#fbedc0", text: "#6b5200" },
    work: { fill: "#ffc531", text: "#3d2e00" },
  },
  dayStart: { fill: "#2f3a99", text: "#ffffff" },
  text: "#24292f",
  muted: "#6e7781",
  accent: "#ff6363",
  cursorText: "#d42a2a",
  now: "#1a9e6b",
  badgeGmt: "#2b6fd6",
  badgeDelta: "#a23fc0",
};

export const DARK_PALETTE: TimelinePalette = {
  cells: {
    sleep: { fill: "#313b8f", text: "#d5daff" },
    marginal: { fill: "#4f4321", text: "#ebdda9" },
    work: { fill: "#e9b12f", text: "#2a1f00" },
  },
  dayStart: { fill: "#1b2160", text: "#ffffff" },
  text: "#e8e8e8",
  muted: "#9aa0a6",
  accent: "#ff6363",
  cursorText: "#ff7b7b",
  now: "#4cd08f",
  badgeGmt: "#6ab0ff",
  badgeDelta: "#d58ae8",
};
