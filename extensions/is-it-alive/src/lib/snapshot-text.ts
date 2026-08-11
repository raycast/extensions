import type { StatusIndicator } from "@/types";

export function formatUptimePercent(uptime: number | null | undefined): string {
  if (uptime === null || uptime === undefined || Number.isNaN(uptime)) {
    return "Unknown";
  }

  return `${uptime.toFixed(2)}% uptime`;
}

export function overallDescription(
  indicator: StatusIndicator,
  activeIncidents: number,
): string {
  if (activeIncidents > 0) {
    return `${activeIncidents} active incident${activeIncidents === 1 ? "" : "s"}`;
  }

  switch (indicator) {
    case "none":
      return "All Systems Operational";
    case "minor":
      return "Degraded Performance";
    case "major":
      return "Partial Outage";
    case "critical":
      return "Major Outage";
    default:
      return "Unknown";
  }
}
