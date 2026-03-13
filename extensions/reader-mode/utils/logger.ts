import { logger, Logger } from "@chrismessina/raycast-logger";

// Default singleton logger - automatically reads verboseLogging preference
export { logger };

export function initLogger() {
  // Logger automatically reads verboseLogging preference from Raycast
}

// Factory for component-specific loggers with prefixes
export function getLogger(prefix: string): Logger {
  return logger.child(`[${prefix}]`);
}
