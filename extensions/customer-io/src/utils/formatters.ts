/**
 * Format a number with locale-specific separators.
 */
export function formatNumber(value: number): string {
  return value.toLocaleString();
}

/**
 * Format a number as a percentage string.
 */
export function formatPercent(value: number): string {
  return `${value}%`;
}

/**
 * Format a broadcast/campaign state for display.
 * Converts "running" to "Sent" for broadcasts.
 */
export function formatState(state?: string): string {
  if (!state) return "Unknown";
  if (state.toLowerCase() === "running") return "Sent";
  return state.charAt(0).toUpperCase() + state.slice(1);
}

/**
 * Returns a markdown-formatted status badge.
 */
export function getStatusBadge(state: string | undefined): string {
  if (!state) return "-";
  switch (state.toLowerCase()) {
    case "active":
    case "running": // Broadcasts use 'running' sometimes
    case "sent":
      return "**Active**"; // Or 'Sent' depending on context, but let's stick to standard badge
    case "draft":
      return "Draft";
    case "paused":
      return "_Paused_";
    case "stopped":
      return "~~Stopped~~";
    default:
      return state;
  }
}

/**
 * Check if a segment type corresponds to a "Data-driven" segment.
 */
export function isDataDrivenSegment(type?: string): boolean {
  const lowerType = type?.toLowerCase() || "";
  return lowerType === "data_driven" || lowerType === "dynamic" || lowerType === "data-driven";
}
