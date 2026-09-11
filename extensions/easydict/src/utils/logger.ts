/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { environment } from "@raycast/api";

const MAX_LOG_TEXT_LENGTH = 150;
const TRUNCATED_MARKER = "[truncated]";
const isDev = environment.isDevelopment;

function truncate(text: string, maxLen = MAX_LOG_TEXT_LENGTH): string {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen) + TRUNCATED_MARKER;
}

function formatTimedSummary(summary: string, duration: string): string {
  const durationSuffix = ` (${duration}ms)`;
  if (summary.length + durationSuffix.length <= MAX_LOG_TEXT_LENGTH) {
    return `${summary}${durationSuffix}`;
  }
  const summaryLength = MAX_LOG_TEXT_LENGTH - TRUNCATED_MARKER.length - durationSuffix.length;
  return `${summary.substring(0, summaryLength)}${TRUNCATED_MARKER}${durationSuffix}`;
}

function formatMsg(prefix: string, label: string, text: string): string {
  return `${prefix} [${label}] ${truncate(text)}`;
}

export function logTrace(label: string, text: string) {
  if (!isDev) return;
  console.log(formatMsg("🔍", label, text));
}

export function logSummary(label: string, text: string) {
  if (!isDev) return;
  console.log(formatMsg("📋", label, text));
}

export function logWarn(label: string, text: string) {
  if (!isDev) return;
  console.warn(formatMsg("⚠️", label, text));
}

export function logError(label: string, text: string, error?: unknown) {
  if (!isDev) return;
  console.error(`❌ [${label}] ${truncate(text)}`, error ?? "");
}

/**
 * Creates a timer that logs duration on completion or failure.
 * Use in provider base classes to centralize timing logic.
 *
 * @example
 * const timer = createTimer(this.type);
 * const result = await doWork();
 * timer.done(`${result.translations.join(", ")}`);
 */
export function createTimer(label: string) {
  const start = performance.now();
  return {
    done(summary: string) {
      const duration = (performance.now() - start).toFixed(0);
      logTrace(label, formatTimedSummary(summary, duration));
    },
    fail(summary = "request failed") {
      const duration = (performance.now() - start).toFixed(0);
      logTrace(label, formatTimedSummary(summary, duration));
    },
  };
}
