/**
 * Logging service for Harmony Hub integration.
 * Provides structured logging with levels, history, and formatting.
 * @module
 */

import { LogLevel, LogEntry, LoggerOptions, ILogger } from "../types/core/logging";

/**
 * Default logger configuration
 */
const DEFAULT_OPTIONS: LoggerOptions = {
  minLevel: LogLevel.INFO,
  maxEntries: 1000,
  includeTimestamp: true,
  includeLevel: true,
};

/**
 * Service for structured logging in the Harmony extension.
 * Supports multiple log levels, history tracking, and configurable formatting.
 */
class LoggerImpl implements ILogger {
  /** Current logger configuration */
  private options: LoggerOptions = DEFAULT_OPTIONS;
  /** Log history */
  private history: LogEntry[] = [];

  /** Singleton instance */
  private static instance: LoggerImpl | null = null;

  /** Get the singleton instance */
  public static getInstance(): LoggerImpl {
    if (!LoggerImpl.instance) {
      LoggerImpl.instance = new LoggerImpl();
    }
    return LoggerImpl.instance;
  }

  private constructor() {
    // Bind all methods to this instance
    this.debug = this.debug.bind(this);
    this.info = this.info.bind(this);
    this.warn = this.warn.bind(this);
    this.error = this.error.bind(this);
    this.logError = this.logError.bind(this);
    this.getHistory = this.getHistory.bind(this);
    this.clearHistory = this.clearHistory.bind(this);
    this.setMinLevel = this.setMinLevel.bind(this);
    this.configure = this.configure.bind(this);
  }

  /**
   * Configure the logger.
   * Updates logger settings while preserving existing log history.
   * @param options - New logger options
   */
  configure(options: Partial<LoggerOptions>): void {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Log a debug message.
   * Only logs if minimum level is DEBUG.
   * @param message - Message to log
   * @param data - Optional data to include
   */
  debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Log an info message.
   * Only logs if minimum level is INFO or lower.
   * @param message - Message to log
   * @param data - Optional data to include
   */
  info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Log a warning message.
   * Only logs if minimum level is WARN or lower.
   * @param message - Message to log
   * @param data - Optional data to include
   */
  warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Log an error message.
   * Only logs if minimum level is ERROR or lower.
   * @param message - Message to log
   * @param data - Optional data to include
   */
  error(message: string, data?: unknown): void {
    this.log(LogLevel.ERROR, message, data);
  }

  /**
   * Log an error with full stack trace.
   * Includes error details and optional context.
   * @param error - Error to log
   * @param context - Optional context information
   */
  logError(error: Error, context?: string): void {
    const message = context ? `${context}: ${error.message}` : error.message;
    this.error(message, {
      name: error.name,
      stack: error.stack,
      context,
    });
  }

  /**
   * Get the current log history.
   * Returns a copy of the log entries.
   * @returns Array of log entries
   */
  getHistory(): LogEntry[] {
    return [...this.history];
  }

  /**
   * Clear the log history.
   * Removes all stored log entries.
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Set the minimum log level.
   * Updates which messages will be logged.
   * @param level - New minimum log level
   */
  setMinLevel(level: LogLevel): void {
    this.options.minLevel = level;
  }

  /**
   * Internal method to create a log entry.
   * Formats and stores the log entry based on configuration.
   * @param level - Log level
   * @param message - Log message
   * @param data - Optional data to include
   * @private
   */
  private log(level: LogLevel, message: string, data?: unknown): void {
    if (level < (this.options.minLevel ?? LogLevel.INFO)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    };

    this.history.push(entry);

    // Trim history if it exceeds max entries
    if (this.options.maxEntries && this.history.length > this.options.maxEntries) {
      this.history = this.history.slice(-this.options.maxEntries);
    }

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      const prefix = this.formatPrefix(entry);
      console.log(prefix, message, data ? data : "");
    }
  }

  /**
   * Format the prefix for a log entry.
   * Includes timestamp and level based on configuration.
   * @param entry - Log entry to format
   * @returns Formatted prefix string
   * @private
   */
  private formatPrefix(entry: LogEntry): string {
    const parts: string[] = [];

    if (this.options.includeTimestamp) {
      parts.push(entry.timestamp);
    }

    if (this.options.includeLevel) {
      parts.push(`[${LogLevel[entry.level]}]`);
    }

    return parts.join(" ");
  }
}

// Create and export the singleton instance
const logger = LoggerImpl.getInstance();

// Export the logger type for type checking
export type LoggerType = typeof LoggerImpl;

// Export the logger class for type checking
export const Logger = LoggerImpl;

// Export the logger instance methods for convenience
export const { debug, info, warn, error, logError, getHistory, clearHistory, setMinLevel, configure } = logger;
