/**
 * Error severity utilities for enhanced status indicators
 */

import { Icon } from "@raycast/api";

export enum ErrorSeverity {
  NONE = "none",
  INFO = "info",
  WARNING = "warning",
  CRITICAL = "critical",
}

export interface SeverityIndicator {
  level: ErrorSeverity;
  icon: Icon;
  color: string;
  description: string;
  badge?: string;
}

/**
 * Determine error severity based on error count and thresholds
 */
export function getErrorSeverity(
  errorCount: number,
  warningThreshold: number,
  criticalThreshold: number,
): ErrorSeverity {
  if (errorCount === 0) return ErrorSeverity.NONE;
  if (errorCount >= criticalThreshold) return ErrorSeverity.CRITICAL;
  if (errorCount >= warningThreshold) return ErrorSeverity.WARNING;
  return ErrorSeverity.INFO;
}

/**
 * Get severity indicator for display
 */
export function getSeverityIndicator(severity: ErrorSeverity, hasNewErrors = false): SeverityIndicator {
  const indicators: Record<ErrorSeverity, SeverityIndicator> = {
    [ErrorSeverity.NONE]: {
      level: ErrorSeverity.NONE,
      icon: Icon.Checkmark,
      color: "green",
      description: "No errors",
    },
    [ErrorSeverity.INFO]: {
      level: ErrorSeverity.INFO,
      icon: Icon.Info,
      color: "blue",
      description: "Minor errors",
    },
    [ErrorSeverity.WARNING]: {
      level: ErrorSeverity.WARNING,
      icon: Icon.ExclamationMark,
      color: "yellow",
      description: "Warning level errors",
    },
    [ErrorSeverity.CRITICAL]: {
      level: ErrorSeverity.CRITICAL,
      icon: Icon.ExclamationMark,
      color: "red",
      description: "Critical level errors",
    },
  };

  const indicator = indicators[severity];

  if (hasNewErrors) {
    indicator.badge = "NEW";
  }

  return indicator;
}

/**
 * Get severity-based menu bar title color
 */
export function getSeverityMenuBarTitle(severity: ErrorSeverity): string {
  switch (severity) {
    case ErrorSeverity.CRITICAL:
      return "🔴";
    case ErrorSeverity.WARNING:
      return "🟡";
    case ErrorSeverity.INFO:
      return "🔵";
    default:
      return "🟢";
  }
}

/**
 * Get error category based on error message patterns
 */
export function categorizeError(errorMessage: string): string {
  const message = errorMessage.toLowerCase();

  if (message.includes("timeout") || message.includes("timed out")) {
    return "Timeout";
  }
  if (message.includes("rate limit") || message.includes("throttle")) {
    return "Rate Limit";
  }
  if (message.includes("auth") || message.includes("unauthorized") || message.includes("forbidden")) {
    return "Authentication";
  }
  if (message.includes("network") || message.includes("connection") || message.includes("dns")) {
    return "Network";
  }
  if (message.includes("validation") || message.includes("invalid") || message.includes("required")) {
    return "Validation";
  }
  if (message.includes("internal server") || message.includes("500")) {
    return "Server Error";
  }
  if (message.includes("not found") || message.includes("404")) {
    return "Not Found";
  }

  return "General";
}

/**
 * Get error category icon
 */
export function getErrorCategoryIcon(category: string): Icon {
  switch (category) {
    case "Timeout":
      return Icon.Clock;
    case "Rate Limit":
      return Icon.Gauge;
    case "Authentication":
      return Icon.Lock;
    case "Network":
      return Icon.Globe;
    case "Validation":
      return Icon.CheckCircle;
    case "Server Error":
      return Icon.ComputerChip;
    case "Not Found":
      return Icon.QuestionMark;
    default:
      return Icon.ExclamationMark;
  }
}

/**
 * Generate error summary with categories
 */
export function generateErrorSummary(errors: Array<{ msg?: string; error?: { msg?: string } }>): {
  categories: Record<string, number>;
  totalErrors: number;
  mostCommonCategory: string;
} {
  const categories: Record<string, number> = {};

  errors.forEach((error) => {
    const message = error.msg || error.error?.msg || "Unknown error";
    const category = categorizeError(message);
    categories[category] = (categories[category] || 0) + 1;
  });

  const totalErrors = errors.length;
  const mostCommonCategory = Object.entries(categories).sort(([, a], [, b]) => b - a)[0]?.[0] || "General";

  return {
    categories,
    totalErrors,
    mostCommonCategory,
  };
}
