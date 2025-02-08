/**
 * Log levels for application logging
 * @enum {number}
 */
export enum LogLevel {
  /** Debug level for detailed troubleshooting */
  DEBUG = 0,
  /** Info level for general operational messages */
  INFO = 1,
  /** Warning level for potentially problematic situations */
  WARN = 2,
  /** Error level for error conditions */
  ERROR = 3,
}

/**
 * Interface for logger configuration options
 * @interface LoggerOptions
 */
export interface LoggerOptions {
  /** Minimum log level to record */
  minLevel?: LogLevel;
  /** Maximum number of log entries to keep in memory */
  maxEntries?: number;
  /** Whether to include timestamps in log entries */
  includeTimestamp?: boolean;
  /** Whether to include log level in entries */
  includeLevel?: boolean;
}

/**
 * Structure of a log entry
 * @interface LogEntry
 */
export interface LogEntry {
  /** ISO timestamp of when the entry was created */
  timestamp: string;
  /** Log level of the entry */
  level: LogLevel;
  /** Log message */
  message: string;
  /** Optional additional data */
  data?: unknown;
}

/**
 * Interface for logger implementations
 * @interface ILogger
 */
export interface ILogger {
  /**
   * Log a debug message
   * @param message - Message to log
   * @param data - Optional data to include
   */
  debug(message: string, data?: unknown): void;

  /**
   * Log an info message
   * @param message - Message to log
   * @param data - Optional data to include
   */
  info(message: string, data?: unknown): void;

  /**
   * Log a warning message
   * @param message - Message to log
   * @param data - Optional data to include
   */
  warn(message: string, data?: unknown): void;

  /**
   * Log an error message
   * @param message - Message to log
   * @param data - Optional data to include
   */
  error(message: string, data?: unknown): void;

  /**
   * Log an error with full stack trace
   * @param error - Error to log
   * @param context - Optional context information
   */
  logError(error: Error, context?: string): void;

  /**
   * Get log history
   */
  getHistory(): LogEntry[];

  /**
   * Clear log history
   */
  clearHistory(): void;

  /**
   * Set minimum log level
   */
  setMinLevel(level: LogLevel): void;
}

/**
 * Type for log entry filter functions
 * @type {LogFilter}
 */
export type LogFilter = (entry: LogEntry) => boolean;

/**
 * Type for log entry formatter functions
 * @type {LogFormatter}
 */
export type LogFormatter = (entry: LogEntry) => string;
