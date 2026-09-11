import { logger, Logger } from "@chrismessina/raycast-logger";

export { logger };

export function getLogger(prefix: string): Logger {
  return logger.child(`[${prefix}]`);
}
