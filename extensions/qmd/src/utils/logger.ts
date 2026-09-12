import { Logger } from "@chrismessina/raycast-logger";

/**
 * Main logger instance for the QMD extension.
 */
export const logger = new Logger({
  prefix: "[QMD]",
  colorize: false,
});

/**
 * Child loggers for dependencies.
 */
export const depsLogger = logger.child("[Deps]");

/**
 * Child logger for search operations.
 */
export const searchLogger = logger.child("[Search]");

/**
 * Child logger for collection operations.
 */
export const collectionsLogger = logger.child("[Collections]");

/**
 * Child logger for context operations.
 */
export const contextsLogger = logger.child("[Contexts]");

/**
 * Child logger for embedding operations.
 */
export const embedLogger = logger.child("[Embed]");

/**
 * Child logger for QMD binary path resolution.
 */
export const qmdLogger = logger.child("[QMD Path]");
