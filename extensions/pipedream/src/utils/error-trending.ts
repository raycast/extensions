import { WorkflowError } from "../types";

export interface DayErrorCount {
  date: string; // YYYY-MM-DD format
  count: number;
  errors: WorkflowError[];
}

export interface ErrorTrend {
  direction: "up" | "down" | "stable";
  indicator: "↑" | "↓" | "→";
  percentage: number;
  description: string;
}

export interface WeeklyErrorSummary {
  totalErrors: number;
  dailyAverage: number;
  peakDay: { date: string; count: number };
  trend: ErrorTrend;
  dailyCounts: DayErrorCount[];
}

/**
 * Groups errors by day for the past 7 days
 */
export function groupErrorsByDay(errors: WorkflowError[]): DayErrorCount[] {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Create array of past 7 days
  const days: DayErrorCount[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split("T")[0] || ""; // YYYY-MM-DD format
    days.push({
      date: dateStr,
      count: 0,
      errors: [],
    });
  }

  // Group errors by day
  const recentErrors = errors.filter((error) => error.indexed_at_ms >= sevenDaysAgo.getTime());

  recentErrors.forEach((error) => {
    const errorDate = new Date(error.indexed_at_ms);
    const errorDateStr = errorDate.toISOString().split("T")[0] || "";

    const dayIndex = days.findIndex((day) => day.date === errorDateStr);
    if (dayIndex !== -1) {
      days[dayIndex]!.count++;
      days[dayIndex]!.errors.push(error);
    }
  });

  return days;
}

/**
 * Groups errors by day but only returns days that have data coverage
 * This is useful when we have limited error data (e.g., only 100 errors)
 */
export function groupErrorsByDayWithCoverage(errors: WorkflowError[]): {
  dailyCounts: DayErrorCount[];
  hasFullCoverage: boolean;
  oldestErrorDate: string;
  coverageDays: number;
  daysWithData: number;
} {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Filter to recent errors
  const recentErrors = errors.filter((error) => error.indexed_at_ms >= sevenDaysAgo.getTime());

  if (recentErrors.length === 0) {
    return {
      dailyCounts: [],
      hasFullCoverage: false,
      oldestErrorDate: "",
      coverageDays: 0,
      daysWithData: 0,
    };
  }

  // Find the oldest error date to determine coverage
  const oldestError = recentErrors.reduce((oldest, current) =>
    current.indexed_at_ms < oldest.indexed_at_ms ? current : oldest,
  );

  const oldestErrorDate = new Date(oldestError.indexed_at_ms);
  const oldestErrorDateStr = oldestErrorDate.toISOString().split("T")[0] || "";

  // Calculate how many days of coverage we have
  const coverageMs = now.getTime() - oldestErrorDate.getTime();
  const coverageDays = Math.min(Math.ceil(coverageMs / (24 * 60 * 60 * 1000)), 7);

  // Create a map to store errors by day
  const errorsByDay = new Map<string, WorkflowError[]>();
  recentErrors.forEach((error) => {
    const errorDateStr = new Date(error.indexed_at_ms).toISOString().split("T")[0] || "";
    if (!errorsByDay.has(errorDateStr)) {
      errorsByDay.set(errorDateStr, []);
    }
    errorsByDay.get(errorDateStr)!.push(error);
  });

  const daysWithData = errorsByDay.size;

  // Create array only for days we have coverage
  const days: DayErrorCount[] = [];
  for (let i = coverageDays - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split("T")[0] || "";
    const errorsForDay = errorsByDay.get(dateStr) || [];
    days.push({
      date: dateStr,
      count: errorsForDay.length,
      errors: errorsForDay,
    });
  }

  return {
    dailyCounts: days,
    hasFullCoverage: coverageDays === 7 && errors.length >= 100,
    oldestErrorDate: oldestErrorDateStr,
    coverageDays,
    daysWithData,
  };
}

/**
 * Calculates error trend based on recent vs older periods
 */
export function calculateErrorTrend(dailyCounts: DayErrorCount[]): ErrorTrend {
  if (dailyCounts.length < 4) {
    return {
      direction: "stable",
      indicator: "→",
      percentage: 0,
      description: "Not enough data",
    };
  }

  // Compare recent 3 days vs previous 3 days (excluding today which might be incomplete)
  const recent3Days = dailyCounts.slice(-4, -1); // Skip today, take 3 days
  const previous3Days = dailyCounts.slice(-7, -4); // Take 3 days before that

  const recentTotal = recent3Days.reduce((sum, day) => sum + day.count, 0);
  const previousTotal = previous3Days.reduce((sum, day) => sum + day.count, 0);

  if (previousTotal === 0) {
    if (recentTotal === 0) {
      return {
        direction: "stable",
        indicator: "→",
        percentage: 0,
        description: "No errors",
      };
    } else {
      return {
        direction: "up",
        indicator: "↑",
        percentage: 100,
        description: "New errors appeared",
      };
    }
  }

  const percentageChange = ((recentTotal - previousTotal) / previousTotal) * 100;

  if (Math.abs(percentageChange) < 10) {
    return {
      direction: "stable",
      indicator: "→",
      percentage: Math.abs(percentageChange),
      description: `Stable (${percentageChange >= 0 ? "+" : ""}${Math.round(percentageChange)}%)`,
    };
  } else if (percentageChange > 0) {
    return {
      direction: "up",
      indicator: "↑",
      percentage: percentageChange,
      description: `Increasing (+${Math.round(percentageChange)}%)`,
    };
  } else {
    return {
      direction: "down",
      indicator: "↓",
      percentage: Math.abs(percentageChange),
      description: `Decreasing (${Math.round(percentageChange)}%)`,
    };
  }
}

/**
 * Generates a weekly error summary
 */
export function generateWeeklyErrorSummary(errors: WorkflowError[]): WeeklyErrorSummary {
  const dailyCounts = groupErrorsByDay(errors);
  const totalErrors = dailyCounts.reduce((sum, day) => sum + day.count, 0);
  const dailyAverage = totalErrors / 7;

  // Find peak day
  const peakDay = dailyCounts.reduce((peak, day) => (day.count > peak.count ? day : peak));

  const trend = calculateErrorTrend(dailyCounts);

  return {
    totalErrors,
    dailyAverage,
    peakDay: {
      date: peakDay.date,
      count: peakDay.count,
    },
    trend,
    dailyCounts,
  };
}

/**
 * Formats a date string for display
 */
export function formatDateForDisplay(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  }
}

/**
 * Generates a text-based bar chart for error counts
 */
export function generateTextBarChart(dailyCounts: DayErrorCount[]): string {
  const maxCount = Math.max(...dailyCounts.map((day) => day.count));
  if (maxCount === 0) return "No errors in the past 7 days";

  const maxBarLength = 20;

  return dailyCounts
    .map((day) => {
      const barLength = Math.round((day.count / maxCount) * maxBarLength);
      const bar = "█".repeat(barLength) + "░".repeat(maxBarLength - barLength);
      const dateLabel = formatDateForDisplay(day.date).padEnd(9);
      return `${dateLabel} ${bar} ${day.count}`;
    })
    .join("\n");
}
