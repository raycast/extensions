/**
 * Memory diagnostics utilities.
 *
 * Provides functions for monitoring memory usage in Raycast's constrained
 * worker environment. Helps identify memory issues and potential leaks.
 *
 * Usage:
 *   import { memoryLogger, logMemory, withMemoryTracking } from "./memory";
 *
 *   // Simple logging
 *   logMemory("Before large operation");
 *
 *   // Track memory around an operation
 *   const result = await withMemoryTracking("fetchFormulae", async () => {
 *     return await fetchData();
 *   });
 */

import { Logger } from "@chrismessina/raycast-logger";

/**
 * Memory logger instance.
 */
export const memoryLogger = new Logger({
  prefix: "[Brew]",
}).child("[Memory]");

/**
 * Memory usage snapshot with additional context.
 */
export interface MemorySnapshot {
  /** Timestamp of the snapshot */
  timestamp: number;
  /** Label for this snapshot */
  label: string;
  /** Resident Set Size - total memory allocated to the process */
  rss: number;
  /** Total heap size allocated */
  heapTotal: number;
  /** Heap memory currently in use */
  heapUsed: number;
  /** Memory used by external C++ objects */
  external: number;
  /** Memory used by ArrayBuffers */
  arrayBuffers: number;
  /** Percentage of heap used (heapUsed / heapTotal) */
  heapPercent: number;
  /** Caller information (function name, file, line) */
  caller?: CallerInfo;
  /** Stack trace (if enabled) */
  stack?: string;
}

/**
 * Caller information extracted from stack trace.
 */
export interface CallerInfo {
  /** Function name */
  functionName: string;
  /** File path */
  fileName: string;
  /** Line number */
  lineNumber: number;
  /** Column number */
  columnNumber: number;
}

/**
 * Memory tracking result for operations.
 */
export interface MemoryTrackingResult<T> {
  /** The result of the tracked operation */
  result: T;
  /** Memory snapshot before the operation */
  before: MemorySnapshot;
  /** Memory snapshot after the operation */
  after: MemorySnapshot;
  /** Memory delta (after - before) */
  delta: MemoryDelta;
  /** Duration of the operation in milliseconds */
  durationMs: number;
}

/**
 * Memory delta between two snapshots.
 */
export interface MemoryDelta {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
}

/**
 * Warning thresholds for memory usage.
 */
const MEMORY_THRESHOLDS = {
  /** Warn when heap usage exceeds this percentage */
  heapPercentWarning: 70,
  /** Critical when heap usage exceeds this percentage */
  heapPercentCritical: 85,
  /** Warn when a single operation increases heap by this many MB */
  deltaWarningMB: 50,
};

/**
 * Format bytes to a human-readable string.
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Parse a V8 stack trace line to extract caller info.
 * Format: "    at functionName (filePath:line:column)"
 * Or:     "    at filePath:line:column"
 */
function parseStackLine(line: string): CallerInfo | undefined {
  // Match: "at functionName (filePath:line:column)"
  const withFunctionMatch = line.match(/at\s+(.+?)\s+\((.+):(\d+):(\d+)\)/);
  if (withFunctionMatch) {
    return {
      functionName: withFunctionMatch[1],
      fileName: withFunctionMatch[2],
      lineNumber: parseInt(withFunctionMatch[3], 10),
      columnNumber: parseInt(withFunctionMatch[4], 10),
    };
  }

  // Match: "at filePath:line:column" (anonymous function)
  const anonymousMatch = line.match(/at\s+(.+):(\d+):(\d+)/);
  if (anonymousMatch) {
    return {
      functionName: "<anonymous>",
      fileName: anonymousMatch[1],
      lineNumber: parseInt(anonymousMatch[2], 10),
      columnNumber: parseInt(anonymousMatch[3], 10),
    };
  }

  return undefined;
}

/**
 * Get caller information from the current stack trace.
 * @param skipFrames Number of stack frames to skip (default: 2 to skip this function and the caller)
 */
function getCallerInfo(skipFrames = 2): CallerInfo | undefined {
  const stack = new Error().stack;
  if (!stack) return undefined;

  const lines = stack.split("\n");
  // Skip "Error" line and the specified number of frames
  const callerLine = lines[skipFrames + 1];
  if (!callerLine) return undefined;

  return parseStackLine(callerLine);
}

/**
 * Get a cleaned stack trace string.
 * @param skipFrames Number of stack frames to skip
 * @param maxFrames Maximum number of frames to include
 */
function getStackTrace(skipFrames = 2, maxFrames = 5): string {
  const stack = new Error().stack;
  if (!stack) return "";

  const lines = stack.split("\n");
  // Skip "Error" line and the specified number of frames
  const relevantLines = lines.slice(skipFrames + 1, skipFrames + 1 + maxFrames);

  return relevantLines.map((line) => line.trim()).join("\n");
}

/**
 * Take a memory snapshot with caller information.
 * @param label A descriptive label for this snapshot
 * @param includeStack Whether to include the full stack trace
 */
export function takeMemorySnapshot(label: string, includeStack = false): MemorySnapshot {
  const mem = process.memoryUsage();
  const heapPercent = mem.heapTotal > 0 ? (mem.heapUsed / mem.heapTotal) * 100 : 0;

  const snapshot: MemorySnapshot = {
    timestamp: Date.now(),
    label,
    rss: mem.rss,
    heapTotal: mem.heapTotal,
    heapUsed: mem.heapUsed,
    external: mem.external,
    arrayBuffers: mem.arrayBuffers,
    heapPercent,
    caller: getCallerInfo(3), // Skip: takeMemorySnapshot, logMemory/withMemoryTracking, actual caller
  };

  if (includeStack) {
    snapshot.stack = getStackTrace(3);
  }

  return snapshot;
}

/**
 * Calculate the delta between two memory snapshots.
 */
function calculateDelta(before: MemorySnapshot, after: MemorySnapshot): MemoryDelta {
  return {
    rss: after.rss - before.rss,
    heapTotal: after.heapTotal - before.heapTotal,
    heapUsed: after.heapUsed - before.heapUsed,
    external: after.external - before.external,
    arrayBuffers: after.arrayBuffers - before.arrayBuffers,
  };
}

/**
 * Get a warning indicator based on heap percentage.
 */
function getWarningIndicator(heapPercent: number): string {
  if (heapPercent >= MEMORY_THRESHOLDS.heapPercentCritical) return "🔴 CRITICAL";
  if (heapPercent >= MEMORY_THRESHOLDS.heapPercentWarning) return "⚠️ HIGH";
  return "";
}

/**
 * Format a memory snapshot for logging.
 */
function formatSnapshot(snapshot: MemorySnapshot): Record<string, unknown> {
  const warning = getWarningIndicator(snapshot.heapPercent);

  const result: Record<string, unknown> = {
    label: snapshot.label,
    heapUsed: formatBytes(snapshot.heapUsed),
    heapTotal: formatBytes(snapshot.heapTotal),
    heapPercent: `${snapshot.heapPercent.toFixed(1)}%`,
    rss: formatBytes(snapshot.rss),
  };

  if (warning) {
    result.warning = warning;
  }

  if (snapshot.caller) {
    const { functionName, fileName, lineNumber } = snapshot.caller;
    // Shorten file path for readability
    const shortFileName = fileName.split("/").slice(-2).join("/");
    result.caller = `${functionName} (${shortFileName}:${lineNumber})`;
  }

  if (snapshot.stack) {
    result.stack = snapshot.stack;
  }

  return result;
}

/**
 * Log current memory usage with caller information.
 * @param label A descriptive label for this log entry
 * @param includeStack Whether to include the full stack trace
 */
export function logMemory(label: string, includeStack = false): MemorySnapshot {
  const snapshot = takeMemorySnapshot(label, includeStack);
  memoryLogger.log(label, formatSnapshot(snapshot));
  return snapshot;
}

/**
 * Log a warning if memory usage is high.
 * @param label A descriptive label
 * @param snapshot The memory snapshot to check
 */
function logMemoryWarning(label: string, snapshot: MemorySnapshot): void {
  if (snapshot.heapPercent >= MEMORY_THRESHOLDS.heapPercentCritical) {
    memoryLogger.error(`${label} - CRITICAL memory usage`, {
      ...formatSnapshot(snapshot),
      recommendation: "Consider reducing data size or clearing cache",
    });
  } else if (snapshot.heapPercent >= MEMORY_THRESHOLDS.heapPercentWarning) {
    memoryLogger.warn(`${label} - High memory usage`, formatSnapshot(snapshot));
  }
}

/**
 * Track memory usage around an async operation.
 * Logs before/after snapshots and the delta.
 *
 * @param operationName Name of the operation being tracked
 * @param operation The async operation to track
 * @param options Tracking options
 * @returns The result of the operation along with memory tracking data
 */
export async function withMemoryTracking<T>(
  operationName: string,
  operation: () => Promise<T>,
  options: { includeStack?: boolean; logAlways?: boolean } = {},
): Promise<MemoryTrackingResult<T>> {
  const { includeStack = false, logAlways = true } = options;

  const before = takeMemorySnapshot(`Before ${operationName}`, includeStack);
  const startTime = Date.now();

  if (logAlways) {
    memoryLogger.log(`Starting: ${operationName}`, formatSnapshot(before));
  }

  let result: T;
  try {
    result = await operation();
  } catch (error) {
    // Log memory state on error
    const errorSnapshot = takeMemorySnapshot(`Error in ${operationName}`, true);
    memoryLogger.error(`Memory state at error in ${operationName}`, {
      ...formatSnapshot(errorSnapshot),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  const after = takeMemorySnapshot(`After ${operationName}`, includeStack);
  const durationMs = Date.now() - startTime;
  const delta = calculateDelta(before, after);

  const deltaHeapMB = delta.heapUsed / (1024 * 1024);
  const isLargeDelta = Math.abs(deltaHeapMB) >= MEMORY_THRESHOLDS.deltaWarningMB;

  if (logAlways || isLargeDelta) {
    memoryLogger.log(`Completed: ${operationName}`, {
      durationMs,
      heapDelta: formatBytes(delta.heapUsed),
      heapBefore: formatBytes(before.heapUsed),
      heapAfter: formatBytes(after.heapUsed),
      heapPercent: `${after.heapPercent.toFixed(1)}%`,
      ...(isLargeDelta ? { warning: `⚠️ Large heap change: ${deltaHeapMB.toFixed(1)} MB` } : {}),
    });
  }

  // Check for warnings after operation
  logMemoryWarning(operationName, after);

  return {
    result,
    before,
    after,
    delta,
    durationMs,
  };
}

/**
 * Synchronous version of withMemoryTracking for non-async operations.
 */
export function withMemoryTrackingSync<T>(
  operationName: string,
  operation: () => T,
  options: { includeStack?: boolean; logAlways?: boolean } = {},
): MemoryTrackingResult<T> {
  const { includeStack = false, logAlways = true } = options;

  const before = takeMemorySnapshot(`Before ${operationName}`, includeStack);
  const startTime = Date.now();

  if (logAlways) {
    memoryLogger.log(`Starting: ${operationName}`, formatSnapshot(before));
  }

  let result: T;
  try {
    result = operation();
  } catch (error) {
    const errorSnapshot = takeMemorySnapshot(`Error in ${operationName}`, true);
    memoryLogger.error(`Memory state at error in ${operationName}`, {
      ...formatSnapshot(errorSnapshot),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  const after = takeMemorySnapshot(`After ${operationName}`, includeStack);
  const durationMs = Date.now() - startTime;
  const delta = calculateDelta(before, after);

  const deltaHeapMB = delta.heapUsed / (1024 * 1024);
  const isLargeDelta = Math.abs(deltaHeapMB) >= MEMORY_THRESHOLDS.deltaWarningMB;

  if (logAlways || isLargeDelta) {
    memoryLogger.log(`Completed: ${operationName}`, {
      durationMs,
      heapDelta: formatBytes(delta.heapUsed),
      heapBefore: formatBytes(before.heapUsed),
      heapAfter: formatBytes(after.heapUsed),
      heapPercent: `${after.heapPercent.toFixed(1)}%`,
      ...(isLargeDelta ? { warning: `⚠️ Large heap change: ${deltaHeapMB.toFixed(1)} MB` } : {}),
    });
  }

  logMemoryWarning(operationName, after);

  return {
    result,
    before,
    after,
    delta,
    durationMs,
  };
}

/**
 * Get a summary of current memory usage.
 * Useful for periodic health checks.
 */
export function getMemorySummary(): {
  heapUsed: string;
  heapTotal: string;
  heapPercent: string;
  rss: string;
  status: "ok" | "warning" | "critical";
} {
  const mem = process.memoryUsage();
  const heapPercent = mem.heapTotal > 0 ? (mem.heapUsed / mem.heapTotal) * 100 : 0;

  let status: "ok" | "warning" | "critical" = "ok";
  if (heapPercent >= MEMORY_THRESHOLDS.heapPercentCritical) {
    status = "critical";
  } else if (heapPercent >= MEMORY_THRESHOLDS.heapPercentWarning) {
    status = "warning";
  }

  return {
    heapUsed: formatBytes(mem.heapUsed),
    heapTotal: formatBytes(mem.heapTotal),
    heapPercent: `${heapPercent.toFixed(1)}%`,
    rss: formatBytes(mem.rss),
    status,
  };
}
