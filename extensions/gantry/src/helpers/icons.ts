import { Icon, Color } from "@raycast/api";
import type { LaunchJob, JobHealth } from "../lib/types";

const HEALTH_ICON: Record<JobHealth, { source: Icon; tintColor: Color }> = {
  healthy: { source: Icon.CircleFilled, tintColor: Color.Green },
  error: { source: Icon.CircleFilled, tintColor: Color.Red },
  warning: { source: Icon.CircleFilled, tintColor: Color.Yellow },
  unknown: { source: Icon.Circle, tintColor: Color.SecondaryText },
};

export function healthIcon(job: LaunchJob): { source: Icon; tintColor: Color } {
  if (job.isRunning) {
    return { source: Icon.Play, tintColor: Color.Green };
  }
  return HEALTH_ICON[job.health];
}

export function exitTagColor(job: LaunchJob): Color {
  if (job.lastExitCode === null) return Color.SecondaryText;
  if (job.lastExitCode === 0) return Color.Green;
  if (job.lastExitCode < 0) {
    const sig = Math.abs(job.lastExitCode);
    if (sig === 9 || sig === 15) return Color.Yellow;
    return Color.Red;
  }
  return Color.Red;
}

export function sourceLabel(source: LaunchJob["source"]): string {
  switch (source) {
    case "user":
      return "User Agents";
    case "system-agent":
      return "System Agents";
    case "system-daemon":
      return "System Daemons";
  }
}
