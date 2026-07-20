// src/lib/format.ts
import { Icon, Color, List } from "@raycast/api";
import type { Task } from "./types";

/**
 * Visual hierarchy for the leading list-item icon. Color stays in a tight
 * status palette (gray/blue/green/red) — purple/yellow tints make the row
 * feel decorative rather than informational.
 *
 *   - disabled            → gray  MinusCircle      (whole row reads as inert)
 *   - running             → green CircleProgress   (live)
 *   - last run failed     → red   Play / Calendar  (kind icon, red tint)
 *   - scheduled (idle)    → blue  Calendar         (will fire on schedule)
 *   - manual (idle)       → gray  Play             (neutral; user-triggered)
 */
export function statusIcon(task: Task): List.Item.Props["icon"] {
  if (!task.enabled) {
    return { source: Icon.MinusCircle, tintColor: Color.SecondaryText };
  }
  if (task.status === "running") {
    return { source: Icon.CircleProgress, tintColor: Color.Green };
  }
  const kindIcon = task.kind === "scheduled" ? Icon.Calendar : Icon.Play;
  if (typeof task.lastExitCode === "number" && task.lastExitCode !== 0) {
    return { source: kindIcon, tintColor: Color.Red };
  }
  if (task.kind === "scheduled") {
    return { source: kindIcon, tintColor: Color.Blue };
  }
  return { source: kindIcon, tintColor: Color.SecondaryText };
}

/** Right-side accessory: kind chip + enabled marker + relative time. */
export function statusAccessories(task: Task): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];
  if (task.status === "running") {
    accessories.push({
      tag: { value: "Running", color: Color.Green },
      tooltip: "This task is currently executing",
    });
  }
  accessories.push({ text: relativeTime(task.lastRunAt), tooltip: "Last run" });
  return accessories;
}

export function relativeTime(iso?: string): string {
  if (!iso) return "Never";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "Never";
  const diffSec = Math.max(0, (Date.now() - t) / 1000);
  if (diffSec < 60) return `${Math.floor(diffSec)}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}
