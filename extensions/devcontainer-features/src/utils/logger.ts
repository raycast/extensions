const DEBUG = process.env.NODE_ENV === "development";

interface TimingEntry {
  name: string;
  startTime: number;
  endTime?: number;
}

const timings: Map<string, TimingEntry> = new Map();

/**
 * Start timing an operation
 */
export function startTiming(name: string): void {
  if (DEBUG) {
    timings.set(name, { name, startTime: performance.now() });
  }
}

/**
 * End timing an operation and log the result
 */
export function endTiming(name: string): number | null {
  if (DEBUG) {
    const entry = timings.get(name);
    if (entry) {
      entry.endTime = performance.now();
      const duration = entry.endTime - entry.startTime;
      console.log(`[TIMING] ${name}: ${duration.toFixed(2)}ms`);
      timings.delete(name);
      return duration;
    }
  }
  return null;
}

/**
 * Log debug message (only in development)
 */
export function logDebug(message: string, data?: unknown): void {
  if (DEBUG) {
    console.log(`[DEBUG] ${message}`, data ?? "");
  }
}

/**
 * Log info message
 */
export function logInfo(message: string, data?: unknown): void {
  console.log(`[INFO] ${message}`, data ?? "");
}

/**
 * Log warning message
 */
export function logWarn(message: string, data?: unknown): void {
  console.warn(`[WARN] ${message}`, data ?? "");
}

/**
 * Log error message
 */
export function logError(message: string, error?: unknown): void {
  console.error(`[ERROR] ${message}`, error ?? "");
}

/**
 * Time an async operation
 */
export async function timeAsync<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  startTiming(name);
  try {
    return await fn();
  } finally {
    endTiming(name);
  }
}
