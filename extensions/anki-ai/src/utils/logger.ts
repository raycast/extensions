export class Logger {
  static readonly LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
  };

  // Current log level, by default shows INFO and above
  private static currentLogLevel = Logger.LOG_LEVELS.INFO;

  // Debug mode flag
  private static debugMode = false;

  /**
   * Sets the current log level
   */
  static setLogLevel(level: number) {
    if (level >= 0 && level <= 3) {
      this.currentLogLevel = level;
    }
  }

  /**
   * Enables or disables debug mode
   * When enabled, sets the log level to DEBUG
   */
  static setDebugMode(enabled: boolean) {
    this.debugMode = enabled;
    if (enabled) {
      this.setLogLevel(Logger.LOG_LEVELS.DEBUG);
    } else {
      this.setLogLevel(Logger.LOG_LEVELS.INFO);
    }
  }

  /**
   * Checks if debug mode is enabled
   */
  static isDebugMode(): boolean {
    return this.debugMode;
  }

  /**
   * Debug log with additional details
   */
  static debug(message: string, data?: unknown) {
    if (this.currentLogLevel <= Logger.LOG_LEVELS.DEBUG) {
      const timestamp = new Date().toISOString();
      console.debug(`[${timestamp}] [DEBUG] ${message}`, data !== undefined ? data : "");
    }
  }

  /**
   * Informational log for normal operation tracking
   */
  static info(message: string, data?: unknown) {
    if (this.currentLogLevel <= Logger.LOG_LEVELS.INFO) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [INFO] ${message}`, data !== undefined ? data : "");
    }
  }

  /**
   * Warning log for important but non-critical situations
   */
  static warn(message: string, data?: unknown) {
    if (this.currentLogLevel <= Logger.LOG_LEVELS.WARN) {
      const timestamp = new Date().toISOString();
      console.warn(`[${timestamp}] [WARN] ${message}`, data !== undefined ? data : "");
    }
  }

  /**
   * Error log for problematic situations that require attention
   */
  static error(message: string, data?: unknown) {
    if (this.currentLogLevel <= Logger.LOG_LEVELS.ERROR) {
      const timestamp = new Date().toISOString();
      console.error(`[${timestamp}] [ERROR] ${message}`, data !== undefined ? data : "");
    }
  }

  /**
   * Specific log for Anki requests to facilitate diagnosis
   */
  static ankiRequest(action: string, params: Record<string, unknown>, response?: unknown) {
    if (this.currentLogLevel <= Logger.LOG_LEVELS.DEBUG) {
      const timestamp = new Date().toISOString();
      if (response) {
        console.debug(`[${timestamp}] [ANKI] ${action} - Response:`, response);
      } else {
        console.debug(`[${timestamp}] [ANKI] ${action} - Parameters:`, params);
      }
    }
  }

  /**
   * Specific log for AI operations to facilitate diagnosis
   */
  static aiOperation(operation: string, details?: unknown) {
    if (this.currentLogLevel <= Logger.LOG_LEVELS.DEBUG) {
      const timestamp = new Date().toISOString();
      console.debug(`[${timestamp}] [AI] ${operation}`, details !== undefined ? details : "");
    }
  }

  /**
   * Specific log for user preferences
   */
  static preferences(preferences: Record<string, unknown>) {
    if (this.currentLogLevel <= Logger.LOG_LEVELS.DEBUG) {
      const timestamp = new Date().toISOString();
      console.debug(`[${timestamp}] [PREFS] Preferences loaded:`, preferences);
    }
  }
}
