import { SavedWorkflow, WorkflowError } from "../types";

/**
 * Determines if a workflow has new errors since it was last marked as fixed
 */
export function hasNewErrorsSinceFix(workflow: SavedWorkflow, currentErrors: WorkflowError[]): boolean {
  const { errorResolution } = workflow;

  if (!errorResolution) {
    return false; // Never marked as fixed
  }

  // Check if there are more errors than when marked as fixed
  if (currentErrors.length > errorResolution.lastKnownErrorCount) {
    return true;
  }

  // Check if there are any errors newer than when marked as fixed
  if (errorResolution.lastKnownErrorTimestamp) {
    const hasNewerErrors = currentErrors.some(
      (error) => error.indexed_at_ms > errorResolution.lastKnownErrorTimestamp!,
    );
    return hasNewerErrors;
  }

  return false;
}

/**
 * Creates error resolution data for marking a workflow as fixed
 */
export function createErrorResolution(
  currentErrors: WorkflowError[],
  previousResolution?: SavedWorkflow["errorResolution"],
): SavedWorkflow["errorResolution"] {
  const latestError =
    currentErrors.length > 0
      ? currentErrors.reduce((latest, current) => (current.indexed_at_ms > latest.indexed_at_ms ? current : latest))
      : null;

  const now = Date.now();

  // Calculate resolution time if there was a previous error
  const resolutionTime = previousResolution?.lastAttemptAt ? now - previousResolution.lastAttemptAt : undefined;

  // Track resolution attempts
  const attempts = (previousResolution?.attempts || 0) + 1;

  // Generate error categories summary
  const errorCategories: Record<string, number> = {};
  currentErrors.forEach((error) => {
    const message = error.event?.error?.msg || "Unknown error";
    const category = categorizeError(message);
    errorCategories[category] = (errorCategories[category] || 0) + 1;
  });

  return {
    markedAsFixedAt: now,
    lastKnownErrorCount: currentErrors.length,
    lastKnownErrorTimestamp: latestError?.indexed_at_ms,
    resolvedBy: "user", // Could be enhanced to track actual user
    resolutionTime,
    attempts,
    lastAttemptAt: now,
    errorCategories,
  };
}

/**
 * Categorize error based on message patterns
 */
function categorizeError(errorMessage: string): string {
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
 * Checks if a workflow should be automatically unmarked as fixed
 */
export function shouldAutoUnmarkAsFixed(workflow: SavedWorkflow, currentErrors: WorkflowError[]): boolean {
  return hasNewErrorsSinceFix(workflow, currentErrors);
}

/**
 * Gets error resolution status for display
 */
export function getErrorResolutionStatus(
  workflow: SavedWorkflow,
  currentErrors: WorkflowError[],
): {
  isMarkedAsFixed: boolean;
  hasNewErrors: boolean;
  fixedAt?: Date;
  newErrorsCount?: number;
} {
  const { errorResolution } = workflow;

  if (!errorResolution) {
    return {
      isMarkedAsFixed: false,
      hasNewErrors: false,
    };
  }

  const hasNewErrors = hasNewErrorsSinceFix(workflow, currentErrors);
  const newErrorsCount = hasNewErrors ? currentErrors.length - errorResolution.lastKnownErrorCount : 0;

  return {
    isMarkedAsFixed: true,
    hasNewErrors,
    fixedAt: new Date(errorResolution.markedAsFixedAt),
    newErrorsCount: newErrorsCount > 0 ? newErrorsCount : undefined,
  };
}
