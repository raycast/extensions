/**
 * Debug logging utility for the bunq Raycast extension.
 *
 * Logs are only output in development mode (when running via `ray develop`).
 * In production builds, all logging is silently disabled.
 *
 * @example
 * ```ts
 * import { logger } from "./lib/logger";
 *
 * logger.debug("Fetching accounts", { userId: "123" });
 * logger.info("Payment created", { paymentId: 456 });
 * logger.warn("Session expiring soon");
 * logger.error("API request failed", error);
 * ```
 */

import { environment } from "@raycast/api";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

/**
 * Formats a log message with optional context data.
 */
function formatMessage(level: LogLevel, message: string, context?: LogContext | Error): string {
  const timestamp = new Date().toISOString();
  const prefix = `[bunq][${level.toUpperCase()}][${timestamp}]`;

  if (!context) {
    return `${prefix} ${message}`;
  }

  if (context instanceof Error) {
    return `${prefix} ${message}: ${context.message}\n${context.stack || ""}`;
  }

  return `${prefix} ${message} ${JSON.stringify(context)}`;
}

/**
 * Checks if we're in development mode.
 * Raycast sets environment.isDevelopment to true when running via `ray develop`.
 */
function isDev(): boolean {
  return environment.isDevelopment;
}

/**
 * Debug-level logging. Use for detailed troubleshooting information.
 * Only outputs in development mode.
 */
function debug(message: string, context?: LogContext): void {
  if (isDev()) {
    console.debug(formatMessage("debug", message, context));
  }
}

/**
 * Info-level logging. Use for general operational information.
 * Only outputs in development mode.
 */
function info(message: string, context?: LogContext): void {
  if (isDev()) {
    console.info(formatMessage("info", message, context));
  }
}

/**
 * Warn-level logging. Use for potentially problematic situations.
 * Only outputs in development mode.
 */
function warn(message: string, context?: LogContext): void {
  if (isDev()) {
    console.warn(formatMessage("warn", message, context));
  }
}

/**
 * Error-level logging. Use for error conditions.
 * Only outputs in development mode.
 *
 * @param message - Description of the error
 * @param error - Optional Error object or context data
 */
function error(message: string, error?: Error | LogContext): void {
  if (isDev()) {
    console.error(formatMessage("error", message, error));
  }
}

export const logger = {
  debug,
  info,
  warn,
  error,
};
