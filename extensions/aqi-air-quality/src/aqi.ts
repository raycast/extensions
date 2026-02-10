import { Color } from "@raycast/api";
import { AqiScale } from "./types";

export const PM25_BREAKPOINTS = [
  { cLow: 0.0, cHigh: 12.0, iLow: 0, iHigh: 50 },
  { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
  { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
  { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200 },
  { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300 },
  { cLow: 250.5, cHigh: 350.4, iLow: 301, iHigh: 400 },
  { cLow: 350.5, cHigh: 500.4, iLow: 401, iHigh: 500 },
];

export const PM10_BREAKPOINTS = [
  { cLow: 0, cHigh: 54, iLow: 0, iHigh: 50 },
  { cLow: 55, cHigh: 154, iLow: 51, iHigh: 100 },
  { cLow: 155, cHigh: 254, iLow: 101, iHigh: 150 },
  { cLow: 255, cHigh: 354, iLow: 151, iHigh: 200 },
  { cLow: 355, cHigh: 424, iLow: 201, iHigh: 300 },
  { cLow: 425, cHigh: 504, iLow: 301, iHigh: 400 },
  { cLow: 505, cHigh: 604, iLow: 401, iHigh: 500 },
];

export const AQI_COLORS = {
  green: { tint: Color.Green, hex: "#34C759" },
  orange: { tint: Color.Orange, hex: "#FF9500" },
  red: { tint: Color.Red, hex: "#FF3B30" },
};

export function calculateAqiFromBreakpoints(
  value: number,
  breakpoints: Array<{ cLow: number; cHigh: number; iLow: number; iHigh: number }>,
) {
  const clampedValue = Math.max(0, value);
  const match =
    breakpoints.find((bp) => clampedValue >= bp.cLow && clampedValue <= bp.cHigh) ??
    breakpoints[breakpoints.length - 1];
  const { cLow, cHigh, iLow, iHigh } = match;
  const aqi = ((iHigh - iLow) / (cHigh - cLow)) * (clampedValue - cLow) + iLow;
  return Math.round(aqi);
}

export function calculateAqi(pm25: number, pm10: number): number {
  const aqiPm25 = calculateAqiFromBreakpoints(pm25, PM25_BREAKPOINTS);
  const aqiPm10 = calculateAqiFromBreakpoints(pm10, PM10_BREAKPOINTS);
  return Math.max(aqiPm25, aqiPm10);
}

export function getAqiColor(aqi: number, scale: AqiScale) {
  if (scale === "european") {
    if (aqi <= 20) return AQI_COLORS.green;
    if (aqi <= 40) return { tint: Color.Yellow, hex: "#FFD60A" };
    if (aqi <= 60) return AQI_COLORS.orange;
    return AQI_COLORS.red;
  }
  if (aqi <= 50) return AQI_COLORS.green;
  if (aqi <= 100) return AQI_COLORS.orange;
  return AQI_COLORS.red;
}

export function getAqiCategory(aqi: number, scale: AqiScale) {
  if (scale === "european") {
    if (aqi <= 20) return { label: "Good", emoji: "🟢" };
    if (aqi <= 40) return { label: "Fair", emoji: "🟡" };
    if (aqi <= 60) return { label: "Moderate", emoji: "🟠" };
    if (aqi <= 80) return { label: "Poor", emoji: "🔴" };
    if (aqi <= 100) return { label: "Very Poor", emoji: "🟣" };
    return { label: "Extremely Poor", emoji: "☠️" };
  }
  if (aqi <= 50) return { label: "Excellent", emoji: "🟢" };
  if (aqi <= 100) return { label: "Fair", emoji: "🟡" };
  if (aqi <= 150) return { label: "Poor", emoji: "🟠" };
  if (aqi <= 200) return { label: "Unhealthy", emoji: "🔴" };
  if (aqi <= 300) return { label: "Very Unhealthy", emoji: "🟣" };
  return { label: "Dangerous", emoji: "☠️" };
}
