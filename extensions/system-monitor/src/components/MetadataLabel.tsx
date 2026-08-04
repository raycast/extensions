import { Color, List } from "@raycast/api";

import { getSeverity, severityColor } from "../Temperature/TemperatureUtils";

type MetadataText = string | { value: string; color?: Color };

/** How the percentage is labeled in the UI — used to derive resource pressure. */
export type PercentDisplayMode = "usage" | "free";

const WARNING_VALUES = new Set(["unknown", "inactive", "replace soon", "service battery"]);
const SUCCESS_VALUES = new Set(["active", "verified", "normal", "yes"]);
const MUTED_VALUES = new Set([
  "not connected",
  "not available on this mac",
  "wired connection",
  "ac power",
  "battery",
  "loading…",
  "collecting sample…",
  "-",
  "—",
  "no",
]);
const CRITICAL_VALUES = new Set(["critical", "urgent", "replace now", "failing"]);

function isNotApplicableValue(value: string): boolean {
  const lower = value.toLowerCase();
  return lower === "n/a" || value.startsWith("N/A");
}

function isMutedValue(value: string): boolean {
  return MUTED_VALUES.has(value.toLowerCase());
}

/** Higher pressure means the resource is more constrained (used CPU, low free disk, low battery, etc.). */
export function pressureFromDisplay(percent: number, displayMode: PercentDisplayMode): number {
  return displayMode === "free" ? 100 - percent : percent;
}

export function colorForPressurePercent(pressure: number): Color {
  if (pressure >= 90) {
    return Color.Red;
  }

  if (pressure >= 80) {
    return Color.Orange;
  }

  if (pressure >= 60) {
    return Color.Yellow;
  }

  return Color.Green;
}

function colorForValue(trimmed: string): Color | null {
  const lower = trimmed.toLowerCase();

  if (isNotApplicableValue(trimmed)) {
    return Color.Yellow;
  }

  if (WARNING_VALUES.has(lower)) {
    return Color.Orange;
  }

  if (CRITICAL_VALUES.has(lower) || lower.includes("failing")) {
    return Color.Red;
  }

  if (lower === "warning") {
    return Color.Yellow;
  }

  if (SUCCESS_VALUES.has(lower)) {
    return Color.Green;
  }

  if (isMutedValue(trimmed)) {
    return Color.SecondaryText;
  }

  const temperatureMatch = trimmed.match(/^(-?\d+)\s*°C$/);
  if (temperatureMatch) {
    return severityColor(getSeverity(Number(temperatureMatch[1])));
  }

  return null;
}

function metadataText(value: string | undefined | null): MetadataText {
  if (value === undefined || value === null || value.trim() === "") {
    return { value: "Loading…", color: Color.SecondaryText };
  }

  const trimmed = value.trim();
  const color = colorForValue(trimmed);

  if (color) {
    return { value: trimmed, color };
  }

  return trimmed;
}

function coloredPercentText(value: string, displayMode: PercentDisplayMode = "usage"): MetadataText {
  const match = value.trim().match(/^([\d.]+)\s*%/);
  if (!match) {
    return metadataText(value);
  }

  const displayed = parseFloat(match[1]);
  const pressure = pressureFromDisplay(displayed, displayMode);

  return { value: value.trim(), color: colorForPressurePercent(pressure) };
}

function coloredMemoryMetricText(memoryRss: string, memoryPercent: string): MetadataText {
  const percentColored = coloredPercentText(memoryPercent, "usage");
  if (typeof percentColored === "string") {
    return memoryRss;
  }

  return { value: memoryRss, color: percentColored.color };
}

export function coloredAccessoryText(
  text: string,
  displayMode: PercentDisplayMode = "usage",
): string | { value: string; color?: Color } {
  if (text === "Loading…" || text === "Collecting sample…") {
    return { value: text, color: Color.SecondaryText };
  }

  const match = text.match(/^([\d.]+)\s*%/);
  if (!match) {
    return metadataText(text);
  }

  const displayed = parseFloat(match[1]);
  const pressure = pressureFromDisplay(displayed, displayMode);

  return { value: text, color: colorForPressurePercent(pressure) };
}

export function coloredMemoryMetricAccessory(
  memoryRss: string,
  memoryPercent: string,
): string | { value: string; color?: Color } {
  return coloredMemoryMetricText(memoryRss, memoryPercent);
}

export function MetadataLabel({
  title,
  text,
  percentMode,
  colorMemoryFromPercent,
  icon,
}: {
  title: string;
  text?: string | null;
  percentMode?: PercentDisplayMode;
  colorMemoryFromPercent?: string;
  icon?: React.ComponentProps<typeof List.Item.Detail.Metadata.Label>["icon"];
}) {
  let resolved: MetadataText;

  if (text === undefined || text === null) {
    resolved = metadataText(text);
  } else if (colorMemoryFromPercent) {
    resolved = coloredMemoryMetricText(text, colorMemoryFromPercent);
  } else if (percentMode) {
    resolved = coloredPercentText(text, percentMode);
  } else {
    resolved = metadataText(text);
  }

  return <List.Item.Detail.Metadata.Label title={title} text={resolved} icon={icon} />;
}

export function MetadataSection({ title }: { title: string }) {
  return <List.Item.Detail.Metadata.Label title={title} />;
}
