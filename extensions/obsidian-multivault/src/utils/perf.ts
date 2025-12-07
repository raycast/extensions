/**
 * Performance logging utility for debugging slow operations.
 *
 * To enable performance logging:
 * 1. Set PERF_ENABLED = true below
 * 2. Rebuild the extension
 * 3. Logs will be written to: ~/.obsidian-raycast-perf.log
 *
 * Usage:
 *   import { perfLog, perfStart, perfEnd } from "../utils/perf";
 *
 *   // Simple log
 *   perfLog("Something happened");
 *
 *   // Timed operation
 *   const timer = perfStart("myOperation");
 *   // ... do work ...
 *   perfEnd(timer, "processed 100 items");
 */

import fs from "fs";
import os from "os";
import path from "path";

// Toggle this to enable/disable performance logging
const PERF_ENABLED = true;

// Use user's home directory for perf log - works for any user
const PERF_LOG_PATH = path.join(os.homedir(), ".obsidian-raycast-perf.log");

export function perfLog(msg: string): void {
  if (!PERF_ENABLED) return;

  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}\n`;
  try {
    fs.appendFileSync(PERF_LOG_PATH, line);
  } catch (e) {
    // ignore write errors
  }
  console.log(`[PERF] ${msg}`);
}

interface PerfTimer {
  name: string;
  start: number;
}

export function perfStart(name: string): PerfTimer {
  return { name, start: performance.now() };
}

export function perfEnd(timer: PerfTimer, details?: string): number {
  const elapsed = performance.now() - timer.start;
  if (PERF_ENABLED) {
    const msg = details
      ? `${timer.name}: ${elapsed.toFixed(2)}ms - ${details}`
      : `${timer.name}: ${elapsed.toFixed(2)}ms`;
    perfLog(msg);
  }
  return elapsed;
}

/**
 * Wrap a function to automatically log its execution time.
 * Only logs when PERF_ENABLED is true.
 */
export function perfWrap<T extends (...args: unknown[]) => unknown>(
  name: string,
  fn: T
): T {
  if (!PERF_ENABLED) return fn;

  return ((...args: Parameters<T>): ReturnType<T> => {
    const timer = perfStart(name);
    const result = fn(...args);
    perfEnd(timer);
    return result as ReturnType<T>;
  }) as T;
}
