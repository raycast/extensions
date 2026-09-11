/**
 * Structured console logging for the Tesla Clips extension.
 */

import { environment, getPreferenceValues } from "@raycast/api";

type LogContext = Record<string, unknown>;

function isVerboseEnabled(): boolean {
  try {
    const prefs = getPreferenceValues<Preferences.TeslaClips>();
    return environment.isDevelopment || prefs.enableDebugLogging === true;
  } catch {
    return environment.isDevelopment;
  }
}

function formatContext(context?: LogContext): string {
  if (!context || Object.keys(context).length === 0) return "";
  return ` ${JSON.stringify(context)}`;
}

function timestamp(): string {
  return new Date().toISOString();
}

function debug(message: string, context?: LogContext): void {
  if (!isVerboseEnabled()) return;
  console.debug(`[tesla-clips][DEBUG][${timestamp()}] ${message}${formatContext(context)}`);
}

function info(message: string, context?: LogContext): void {
  if (!isVerboseEnabled()) return;
  console.info(`[tesla-clips][INFO][${timestamp()}] ${message}${formatContext(context)}`);
}

function warn(message: string, context?: LogContext): void {
  console.warn(`[tesla-clips][WARN][${timestamp()}] ${message}${formatContext(context)}`);
}

function error(message: string, context?: LogContext): void {
  console.error(`[tesla-clips][ERROR][${timestamp()}] ${message}${formatContext(context)}`);
}

/**
 * Extension logger. `debug` and `info` run only in development or when debug logging is enabled.
 */
export const logger = { debug, info, warn, error };
