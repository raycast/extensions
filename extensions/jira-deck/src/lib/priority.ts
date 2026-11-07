import { Color, Icon, Image } from "@raycast/api";

export type PriorityLevel = "urgent" | "high" | "medium" | "low" | "other";

const LEVELS: Record<string, PriorityLevel> = {
  urgent: "urgent",
  highest: "urgent",
  blocker: "urgent",
  critical: "urgent",
  high: "high",
  major: "high",
  medium: "medium",
  normal: "medium",
  low: "low",
  lowest: "low",
  minor: "low",
  trivial: "low",
};

export const PRIORITY_FILTERS: { level: PriorityLevel; title: string }[] = [
  { level: "urgent", title: "Urgent" },
  { level: "high", title: "High" },
  { level: "medium", title: "Medium" },
  { level: "low", title: "Low" },
  { level: "other", title: "Other" },
];

// Numbered schemes count down from P0, the most urgent.
const NUMBERED: PriorityLevel[] = ["urgent", "high", "medium", "low", "low", "low"];

/**
 * Priority names are set per tenant, so an unfamiliar name is "other", never quietly "low".
 * Knows the standard names, numbered ones like "P2", and names that mix both, like "P1 - High".
 */
export function priorityLevel(name?: string): PriorityLevel {
  const text = name?.trim().toLowerCase();
  if (!text) return "other";
  if (LEVELS[text]) return LEVELS[text];
  const numbered = text.match(/\bp(\d)\b/);
  if (numbered) return NUMBERED[Number(numbered[1])] ?? "low";
  return (
    text
      .split(/[^a-z]+/)
      .map((word) => LEVELS[word])
      .find(Boolean) ?? "other"
  );
}

const ICONS: Record<PriorityLevel, Image.ImageLike> = {
  urgent: { source: Icon.ArrowUpCircleFilled, tintColor: Color.Red },
  high: { source: Icon.ArrowUp, tintColor: Color.Orange },
  medium: { source: Icon.Minus, tintColor: Color.Yellow },
  low: { source: Icon.ArrowDown, tintColor: Color.Blue },
  other: { source: Icon.Circle, tintColor: Color.SecondaryText },
};

/** Always shown with the label, so the icon never has to explain itself. */
export function priorityIcon(name?: string): Image.ImageLike {
  return ICONS[priorityLevel(name)];
}

/** Jira's own name, so "Highest" stays "Highest". */
export function priorityLabel(name?: string): string {
  return name?.trim() || "No priority";
}
