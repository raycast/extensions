import { WorkflowError, ErrorCategory, ErrorSeverity } from "../types";

/**
 * Categorizes an error based on its error message and code
 */
export function categorizeError(error: WorkflowError): ErrorCategory {
  const { msg, code } = error.event.error;
  const message = msg.toLowerCase();
  const errorCode = code.toLowerCase();

  // API Errors
  if (message.includes("api") || message.includes("endpoint") || errorCode.includes("api")) {
    return "api_error";
  }

  // Authentication Errors
  if (
    message.includes("auth") ||
    message.includes("token") ||
    message.includes("unauthorized") ||
    message.includes("forbidden") ||
    errorCode.includes("401") ||
    errorCode.includes("403")
  ) {
    return "authentication_error";
  }

  // Rate Limit Errors
  if (
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    errorCode.includes("429") ||
    message.includes("quota")
  ) {
    return "rate_limit_error";
  }

  // Timeout Errors
  if (
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("deadline") ||
    errorCode.includes("timeout")
  ) {
    return "timeout_error";
  }

  // Validation Errors
  if (
    message.includes("validation") ||
    message.includes("invalid") ||
    message.includes("required") ||
    errorCode.includes("400")
  ) {
    return "validation_error";
  }

  // Network Errors
  if (
    message.includes("network") ||
    message.includes("connection") ||
    message.includes("dns") ||
    errorCode.includes("network")
  ) {
    return "network_error";
  }

  // Configuration Errors
  if (
    message.includes("config") ||
    message.includes("setting") ||
    message.includes("parameter") ||
    message.includes("option")
  ) {
    return "configuration_error";
  }

  // Data Processing Errors
  if (
    message.includes("data") ||
    message.includes("parse") ||
    message.includes("format") ||
    message.includes("processing")
  ) {
    return "data_processing_error";
  }

  return "unknown";
}

/**
 * Determines error severity based on error type and frequency
 */
export function determineSeverity(error: WorkflowError, errorCount: number): ErrorSeverity {
  const category = categorizeError(error);

  // Critical errors
  if (category === "authentication_error" || category === "configuration_error") {
    return "critical";
  }

  // High severity errors
  if (category === "api_error" || category === "rate_limit_error") {
    return "high";
  }

  // Medium severity errors
  if (category === "timeout_error" || category === "data_processing_error") {
    return "medium";
  }

  // Low severity errors
  if (category === "validation_error" || category === "network_error") {
    return "low";
  }

  // Unknown errors - check frequency
  if (errorCount > 10) {
    return "high";
  } else if (errorCount > 5) {
    return "medium";
  }

  return "low";
}

/**
 * Groups errors by category for analysis
 */
export function groupErrorsByCategory(errors: WorkflowError[]): Record<ErrorCategory, WorkflowError[]> {
  const grouped: Record<ErrorCategory, WorkflowError[]> = {
    api_error: [],
    authentication_error: [],
    rate_limit_error: [],
    timeout_error: [],
    validation_error: [],
    network_error: [],
    configuration_error: [],
    data_processing_error: [],
    unknown: [],
  };

  errors.forEach((error) => {
    const category = categorizeError(error);
    grouped[category].push(error);
  });

  return grouped;
}

/**
 * Gets error statistics for analytics
 */
export function getErrorStatistics(errors: WorkflowError[]) {
  const categories = groupErrorsByCategory(errors);
  const severityCounts = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  errors.forEach((error) => {
    const category = categorizeError(error);
    const errorCount = categories[category].length;
    const severity = determineSeverity(error, errorCount);
    severityCounts[severity]++;
  });

  const categoryBreakdown: Record<ErrorCategory, number> = {
    api_error: categories.api_error.length,
    authentication_error: categories.authentication_error.length,
    rate_limit_error: categories.rate_limit_error.length,
    timeout_error: categories.timeout_error.length,
    validation_error: categories.validation_error.length,
    network_error: categories.network_error.length,
    configuration_error: categories.configuration_error.length,
    data_processing_error: categories.data_processing_error.length,
    unknown: categories.unknown.length,
  };

  return {
    totalErrors: errors.length,
    severityBreakdown: severityCounts,
    categoryBreakdown,
    mostCommonCategory: Object.entries(categoryBreakdown).reduce((a, b) =>
      categoryBreakdown[a[0] as ErrorCategory] > categoryBreakdown[b[0] as ErrorCategory] ? a : b,
    )[0] as ErrorCategory,
    mostCommonSeverity: Object.entries(severityCounts).reduce((a, b) =>
      severityCounts[a[0] as ErrorSeverity] > severityCounts[b[0] as ErrorSeverity] ? a : b,
    )[0] as ErrorSeverity,
  };
}

/**
 * Formats error message for display
 */
export function formatErrorMessage(error: WorkflowError): string {
  const message = error.event?.error?.msg || "Unknown error";
  return message.length > 100 ? message.substring(0, 100) + "..." : message;
}

/**
 * Gets the age of an error for display
 */
export function getErrorAge(error: WorkflowError): string {
  const now = Date.now();
  const errorTime = error.indexed_at_ms;
  const diffMs = now - errorTime;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return "Just now";
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${diffDays}d ago`;
  }
}
