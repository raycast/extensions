// Simple logger utility to control log output and prevent duplicates
// Set to false to disable all logs
const ENABLE_LOGS = true;

// Store recent log messages to avoid duplicates
const recentLogs = new Set<string>();
// Store recent error messages separately
const recentErrorLogs = new Set<string>();
const LOG_EXPIRY_MS = 1000; // Clear logs after 1 second

/**
 * Generate a stable hash for a log message and its parameters
 */
function getLogKey(message: unknown, params: unknown[]): string {
  try {
    return `${String(message)}_${JSON.stringify(params)}`;
  } catch {
    return String(message);
  }
}

/**
 * Log a message to the console if logging is enabled
 * Prevents duplicate logs within a short time window
 * Uses the 'recentLogs' Set.
 * @param message Log message or data
 * @param optionalParams Additional parameters to log
 */
export function log(message: unknown, ...optionalParams: unknown[]): void {
  if (!ENABLE_LOGS) return;

  const logKey = getLogKey(message, optionalParams);

  // Skip if this exact log was recently output
  if (recentLogs.has(logKey)) return;

  // Add to recent logs and schedule cleanup
  recentLogs.add(logKey);
  setTimeout(() => {
    recentLogs.delete(logKey);
  }, LOG_EXPIRY_MS);

  // Output the log
  console.log(message, ...optionalParams);
}

/**
 * Log an error to the console if logging is enabled
 * Prevents duplicate errors within a short time window.
 * Uses the 'recentErrorLogs' Set.
 * @param message Error message or data
 * @param optionalParams Additional parameters to log
 */
export function error(message: unknown, ...optionalParams: unknown[]): void {
  if (!ENABLE_LOGS) return;

  const logKey = getLogKey(message, optionalParams);

  // Skip if this exact error was recently output
  if (recentErrorLogs.has(logKey)) return; // Use recentErrorLogs

  // Add to recent error logs and schedule cleanup
  recentErrorLogs.add(logKey); // Use recentErrorLogs
  setTimeout(() => {
    recentErrorLogs.delete(logKey); // Use recentErrorLogs
  }, LOG_EXPIRY_MS);

  // Output the error
  console.error(message, ...optionalParams);
}
