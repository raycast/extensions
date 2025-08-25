import { getPreferenceValues } from "@raycast/api";
import { ExtensionPreferences } from "../types";

// Redaction helpers
function maskEmail(text: string): string {
  return text.replace(
    /([A-Za-z0-9._%+-])[^@\s]*(@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g,
    (_m, p1: string, p2: string) => `${p1}***${p2}`,
  );
}

function redactString(input: string): string {
  let s = input;
  // Mask bearer tokens
  s = s.replace(/bearer\s+[^\s"']+/gi, "Bearer ***");
  // Mask key/value secrets
  s = s.replace(/(password|pass|pwd|secret|token|auth|authorization|key)\s*[:=]\s*[^\s&"']+/gi, "$1=***");
  // Mask 2FA codes when labeled
  s = s.replace(/((?:code|2fa|two[-\s]?factor|otp)\s*[:=\s]+)(\d{4,8})/gi, (_m, p1: string) => `${p1}******`);
  // Mask long hex/base64-like strings
  s = s.replace(/[a-f0-9]{32,}/gi, "***");
  s = s.replace(/[A-Za-z0-9+/]{20,}={0,2}/g, "***");
  // Mask emails
  s = maskEmail(s);
  return s;
}

function redactValueByKey(key: string, value: unknown): unknown {
  const k = key.toLowerCase();
  if (value == null) return value;
  if (typeof value === "string") {
    if (["password", "pass", "pwd", "secret", "token", "auth", "authorization", "applepassword"].includes(k)) {
      return "***";
    }
    if (["code", "otp", "2fa", "twofactor", "two_factor"].includes(k)) {
      return "******";
    }
    if (["email", "appleid", "apple_id", "username", "user"].includes(k)) {
      return maskEmail(value);
    }
    return redactString(value);
  }
  if (typeof value === "number") {
    if (["code", "otp", "2fa"].includes(k)) return 0;
    return value;
  }
  if (typeof value === "object") {
    try {
      const json = JSON.stringify(value, (prop, val) => redactValueByKey(prop, val));
      return JSON.parse(json);
    } catch {
      return value;
    }
  }
  return value;
}

function sanitizeArgs(args: unknown[]): unknown[] {
  return args.map((arg) => {
    if (typeof arg === "string") return redactString(arg);
    if (typeof arg === "object" && arg !== null) {
      try {
        const json = JSON.stringify(arg, (key, value) => redactValueByKey(key, value));
        return JSON.parse(json);
      } catch {
        return arg;
      }
    }
    return arg;
  });
}

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
        console.log(redactString(message), ...sanitizeArgs(args));
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
    console.error(redactString(message), ...sanitizeArgs(args));
  }

  /**
   * Log a warning message (always shown regardless of verbose setting)
   * @param message The warning message to log
   * @param args Additional arguments to log
   */
  public warn(message: string, ...args: unknown[]): void {
    console.warn(redactString(message), ...sanitizeArgs(args));
  }
}

// Export a singleton instance for easy use
export const logger = Logger.getInstance();
