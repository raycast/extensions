import { Color, Icon } from "@raycast/api";

export function getHealthIcon(score: number): { source: Icon; tintColor: Color } {
  if (score >= 90) return { source: Icon.Heart, tintColor: Color.Green };
  if (score >= 70) return { source: Icon.Heart, tintColor: Color.Yellow };
  if (score >= 50) return { source: Icon.Heart, tintColor: Color.Orange };
  return { source: Icon.Heart, tintColor: Color.Red };
}

export function getUsageColor(percent: number): Color {
  if (percent < 50) return Color.Green;
  if (percent < 75) return Color.Yellow;
  if (percent < 90) return Color.Orange;
  return Color.Red;
}

export function getBatteryIcon(percent: number, status: string): { source: Icon; tintColor: Color } {
  const tintColor = percent > 20 ? Color.Green : percent > 10 ? Color.Orange : Color.Red;
  const source = status === "charging" ? Icon.BatteryCharging : Icon.Battery;
  return { source, tintColor };
}
