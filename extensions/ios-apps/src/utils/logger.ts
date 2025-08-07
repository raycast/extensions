import { getPreferenceValues } from "@raycast/api";
import { ExtensionPreferences } from "../types";

/**
 * Logger utility that respects the verbose logging preference
 */
export class Logger {
  private static instance: Logger;

  private constructor() {}

  /**
   * Get the singleton instance of the logger
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Log a message if verbose logging is enabled
   * @param message The message to log
   * @param args Additional arguments to log
   */
  public log(message: string, ...args: unknown[]): void {
    try {
      const preferences = getPreferenceValues<ExtensionPreferences>();
      const verboseLogging = preferences.verboseLogging || false;
      if (verboseLogging) {
        console.log(message, ...args);
      }
    } catch (error) {
      // If we can't read preferences, log the initialization error but continue
      // This could happen during extension initialization or preference corruption
      console.error("[Logger] Failed to read preferences for verbose logging:", error);
      // Default to not logging when preferences are unavailable
    }
  }

  /**
   * Log an error message (always shown regardless of verbose setting)
   * @param message The error message to log
   * @param args Additional arguments to log
   */
  public error(message: string, ...args: unknown[]): void {
    console.error(message, ...args);
  }

  /**
   * Log a warning message (always shown regardless of verbose setting)
   * @param message The warning message to log
   * @param args Additional arguments to log
   */
  public warn(message: string, ...args: unknown[]): void {
    console.warn(message, ...args);
  }
}

// Export a singleton instance for easy use
export const logger = Logger.getInstance();
