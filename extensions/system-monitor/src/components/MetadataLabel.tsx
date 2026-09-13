import { Color, List } from "@raycast/api";

import { temperatureColor } from "../Temperature/TemperatureUtils";

type MetadataText = string | { value: string; color?: Color };

/** How the percentage is labeled in the UI — used to derive resource pressure. */
export type PercentDisplayMode = "usage" | "free";

const WARNING_VALUES = new Set(["unknown", "inactive", "replace soon", "service battery", "urgent"]);
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
const CRITICAL_VALUES = new Set(["critical", "replace now", "failing"]);

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

/**
 * Health color for a status word (`Normal`, `Warning`, `Urgent`, `Critical`, `Verified`, `N/A`, …)
 * or a lone temperature (`45 °C`); null when the value carries no health meaning.
 */
export function colorForStatusValue(value: string): Color | null {
  const trimmed = value.trim();
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
    return temperatureColor(Number(temperatureMatch[1]));
  }

  return null;
}

function metadataText(value: string | undefined | null): MetadataText {
  if (value === undefined || value === null || value.trim() === "") {
    return { value: "Loading…", color: Color.SecondaryText };
  }

  const trimmed = value.trim();
  const color = colorForStatusValue(trimmed);

  return color ? { value: trimmed, color } : trimmed;
}

export function MetadataLabel({
  title,
  text,
  icon,
}: {
  title: string;
  text?: string | null;
  icon?: React.ComponentProps<typeof List.Item.Detail.Metadata.Label>["icon"];
}) {
  return <List.Item.Detail.Metadata.Label title={title} text={metadataText(text)} icon={icon} />;
}

export function MetadataSection({ title }: { title: string }) {
  return <List.Item.Detail.Metadata.Label title={title} />;
}
