import { Color } from "@raycast/api";

export const formatTimeRemaining = (resetTimeStr: string): string => {
  try {
    const resetTime = new Date(resetTimeStr);
    const now = new Date();
    const diffMs = resetTime.getTime() - now.getTime();

    if (diffMs <= 0) {
      return "Resetting...";
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  } catch {
    return "Unknown";
  }
};

export const formatRelativeTime = (date: Date | null): string => {
  if (!date) return "Never";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes === 1) return "1m ago";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours === 1) return "1h ago";
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "1d ago";
  return `${diffDays}d ago`;
};

export const getUtilizationColor = (utilization: number): Color => {
  if (utilization >= 90) return Color.Red;
  if (utilization >= 70) return Color.Yellow;
  return Color.Green;
};

export const getUtilizationIcon = (utilization: number): string => {
  if (utilization >= 90) return "⚠️";
  if (utilization >= 70) return "⚡";
  return "✅";
};

export const createProgressBar = (percentage: number, width: number = 20): string => {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  return "█".repeat(Math.max(0, filled)) + "░".repeat(Math.max(0, empty));
};

export const calculateEstimatedUsage = (
  currentUtilization: number,
  resetTimeStr: string,
  windowDurationHours: number,
): number | null => {
  try {
    const resetTime = new Date(resetTimeStr);
    const now = new Date();

    // Calculate window start time
    const windowStartTime = new Date(resetTime.getTime() - windowDurationHours * 3600 * 1000);

    // Calculate elapsed time percentage
    const totalWindowMs = resetTime.getTime() - windowStartTime.getTime();
    const elapsedMs = now.getTime() - windowStartTime.getTime();

    // Edge cases
    if (elapsedMs <= 0) return currentUtilization; // Before window starts
    if (elapsedMs >= totalWindowMs) return currentUtilization; // Window ended
    if (currentUtilization === 0) return 0; // No usage yet

    const elapsedPercentage = (elapsedMs / totalWindowMs) * 100;

    // Calculate estimated final usage (no cap to show potential overuse)
    const estimatedUsage = (currentUtilization / elapsedPercentage) * 100;

    return estimatedUsage;
  } catch {
    return null;
  }
};

export const calculateAverageUsage = (resetTimeStr: string, windowDurationHours: number): number | null => {
  try {
    const resetTime = new Date(resetTimeStr);
    const now = new Date();

    // Calculate window start time
    const windowStartTime = new Date(resetTime.getTime() - windowDurationHours * 3600 * 1000);

    // Calculate elapsed time percentage
    const totalWindowMs = resetTime.getTime() - windowStartTime.getTime();
    const elapsedMs = now.getTime() - windowStartTime.getTime();

    // Edge cases
    if (elapsedMs <= 0) return 0; // Before window starts
    if (elapsedMs >= totalWindowMs) return 100; // Window ended

    // Calculate ideal average usage percentage
    const averageUsage = (elapsedMs / totalWindowMs) * 100;

    return averageUsage;
  } catch {
    return null;
  }
};
