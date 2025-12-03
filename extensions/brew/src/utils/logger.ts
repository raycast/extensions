/**
 * Logger utilities for the Brew extension.
 *
 * Uses @chrismessina/raycast-logger for verbose logging support.
 * Child loggers are created for different modules to provide context.
 */

import { Logger } from "@chrismessina/raycast-logger";

/**
 * Main logger instance for the Brew extension.
 */
export const logger = new Logger({
  prefix: "[Brew]",
});

/**
 * Child logger for brew command operations.
 */
export const brewLogger = logger.child("[Brew]");

/**
 * Child logger for cache operations.
 */
export const cacheLogger = logger.child("[Cache]");

/**
 * Child logger for action operations (install, uninstall, upgrade).
 */
export const actionsLogger = logger.child("[Actions]");

/**
 * Child logger for fetch operations.
 */
export const fetchLogger = logger.child("[Fetch]");

/**
 * Child logger for search operations.
 */
export const searchLogger = logger.child("[Search]");

/**
 * Child logger for UI operations (toasts, etc.).
 */
export const uiLogger = logger.child("[UI]");
