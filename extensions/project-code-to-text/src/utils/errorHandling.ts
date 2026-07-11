import { bytesToMB } from "../constants";

/**
 * Checks if an error is related to memory issues.
 *
 * @param error - The error to check.
 * @returns True if the error is memory-related, false otherwise.
 */
export function isMemoryError(error: Error): boolean {
  const errorMessage = error.message.toLowerCase();
  return (
    errorMessage.includes("heap") ||
    errorMessage.includes("memory") ||
    errorMessage.includes("out of memory") ||
    errorMessage.includes("worker terminated")
  );
}

/**
 * Formats a memory error with helpful recommendations.
 *
 * @param error - The original error.
 * @param context - Optional context object with additional information (e.g., safetyLimits).
 * @returns A new Error with formatted message including recommendations.
 */
export function formatMemoryError(
  error: Error,
  context?: { safetyLimits?: { totalSize?: number; filesProcessed?: number } },
): Error {
  const projectSize = context?.safetyLimits?.totalSize
    ? bytesToMB(context.safetyLimits.totalSize).toFixed(2)
    : "unknown";
  const fileCount = context?.safetyLimits?.filesProcessed || 0;

  let message = `Memory limit exceeded while processing project.\n\n`;

  if (fileCount > 0 || projectSize !== "unknown") {
    message += `Project statistics:\n`;
    if (fileCount > 0) {
      message += `- Files processed: ${fileCount}\n`;
    }
    if (projectSize !== "unknown") {
      message += `- Total size: ${projectSize} MB\n`;
    }
    message += `\n`;
  }

  message +=
    `Recommendations:\n` +
    `- Use .gitignore to exclude large directories (node_modules, dist, build, .next, .cache)\n` +
    `- Select specific files or directories instead of processing entire project\n` +
    `- Add ignore patterns: "node_modules/, dist/, build/, .next/, .cache/, *.log, vendor/"\n` +
    `- Process smaller subdirectories separately`;

  return new Error(message);
}
