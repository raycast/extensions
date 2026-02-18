import { Color } from "@raycast/api";
import { TempSeverity } from "./types";

export function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

export function formatTemp(tempCelsius: number, unit: "celsius" | "fahrenheit"): string {
  if (tempCelsius <= 0) return "N/A";
  if (unit === "fahrenheit") {
    return `${Math.round(celsiusToFahrenheit(tempCelsius))}\u00b0F`;
  }
  return `${Math.round(tempCelsius)}\u00b0C`;
}

export function getSeverity(
  tempCelsius: number,
  warningThreshold: number,
  criticalThreshold: number,
): TempSeverity {
  if (tempCelsius <= 0) return "unavailable";
  if (tempCelsius >= criticalThreshold) return "critical";
  if (tempCelsius >= warningThreshold) return "hot";
  if (tempCelsius >= warningThreshold - 15) return "warm";
  return "normal";
}

export function severityColor(severity: TempSeverity): Color {
  switch (severity) {
    case "normal":
      return Color.Green;
    case "warm":
      return Color.Yellow;
    case "hot":
      return Color.Orange;
    case "critical":
      return Color.Red;
    case "unavailable":
      return Color.SecondaryText;
  }
}

export function severityLabel(severity: TempSeverity): string {
  switch (severity) {
    case "normal":
      return "Normal";
    case "warm":
      return "Warm";
    case "hot":
      return "Hot";
    case "critical":
      return "Critical";
    case "unavailable":
      return "Unavailable";
  }
}

export function parseThreshold(value: string, fallback: number): number {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) || parsed <= 0 ? fallback : parsed;
}
