/**
 * Logging Utilities
 *
 * Centralized logging system for the Agent Client Protocol Raycast extension
 * with configurable levels and storage integration.
 */

import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { STORAGE_KEYS } from "./storageKeys";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  data?: Record<string, unknown>;
  context?: {
    sessionId?: string;
    agentId?: string;
    userId?: string;
    version?: string;
  };
}

/**
 * Logger class for structured logging
 */
export class Logger {
  private category: string;
  private static currentLevel: LogLevel = LogLevel.INFO;
  private static logs: LogEntry[] = [];
  private static maxLogs = 1000;
  private static persistLogs = false;
  private static consoleLoggingEnabled = false;
  private static initialized = false;

  constructor(category: string) {
    this.category = category;
    Logger.initializeIfNeeded();
  }

  /**
   * Initialize logger with preferences
   */
  private static initializeIfNeeded(): void {
    if (this.initialized) return;

    try {
      const preferences = getPreferenceValues<Preferences>();
      this.consoleLoggingEnabled = preferences.enableLogging ?? false;

      // Map string log level to enum
      const logLevelMap: Record<string, LogLevel> = {
        debug: LogLevel.DEBUG,
        info: LogLevel.INFO,
        warn: LogLevel.WARN,
        error: LogLevel.ERROR,
      };

      this.currentLevel = logLevelMap[preferences.logLevel] ?? LogLevel.INFO;
      this.initialized = true;
    } catch (error) {
      // Preferences not available, use defaults
      this.consoleLoggingEnabled = false;
      this.currentLevel = LogLevel.INFO;
      this.initialized = true;
      console.debug("Logger preferences unavailable, using defaults", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Set global log level
   */
  static setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  /**
   * Enable/disable console logging
   */
  static setConsoleLogging(enabled: boolean): void {
    this.consoleLoggingEnabled = enabled;
  }

  /**
   * Enable/disable log persistence
   */
  static setPersistence(enabled: boolean): void {
    this.persistLogs = enabled;
  }

  /**
   * Debug level logging
   */
  debug(message: string, data?: Record<string, unknown>, context?: LogEntry["context"]): void {
    this.log(LogLevel.DEBUG, message, data, context);
  }

  /**
   * Info level logging
   */
  info(message: string, data?: Record<string, unknown>, context?: LogEntry["context"]): void {
    this.log(LogLevel.INFO, message, data, context);
  }

  /**
   * Warning level logging
   */
  warn(message: string, data?: Record<string, unknown>, context?: LogEntry["context"]): void {
    this.log(LogLevel.WARN, message, data, context);
  }

  /**
   * Error level logging
   */
  error(message: string, data?: Record<string, unknown>, context?: LogEntry["context"]): void {
    this.log(LogLevel.ERROR, message, data, context);
  }

  /**
   * Log ACP protocol messages
   */
  protocol(direction: "sent" | "received", method: string, data?: Record<string, unknown>): void {
    this.debug(`ACP ${direction}: ${method}`, data, { agentId: data?.agentId as string });
  }

  /**
   * Log user actions
   */
  userAction(action: string, data?: Record<string, unknown>, context?: LogEntry["context"]): void {
    this.info(`User action: ${action}`, data, context);
  }

  /**
   * Log performance metrics
   */
  performance(operation: string, duration: number, data?: Record<string, unknown>): void {
    this.info(`Performance: ${operation} took ${duration}ms`, { ...data, duration });
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, data?: Record<string, unknown>, context?: LogEntry["context"]): void {
    // Check if we should log this level
    if (level < Logger.currentLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      category: this.category,
      message,
      data,
      context,
    };

    // Console output
    this.logToConsole(entry);

    // Store in memory
    Logger.logs.unshift(entry);
    if (Logger.logs.length > Logger.maxLogs) {
      Logger.logs = Logger.logs.slice(0, Logger.maxLogs);
    }

    // Persist if enabled
    if (Logger.persistLogs) {
      this.persistLog(entry);
    }
  }

  /**
   * Output to console with formatting
   */
  private logToConsole(entry: LogEntry): void {
    // Skip console output if logging is disabled
    if (!Logger.consoleLoggingEnabled) {
      return;
    }

    const timestamp = entry.timestamp.toISOString();
    const levelName = LogLevel[entry.level];
    const prefix = `[${timestamp}] [${levelName}] [${entry.category}]`;

    const logMethod = this.getConsoleMethod(entry.level);

    if (entry.data) {
      logMethod(`${prefix} ${entry.message}`, entry.data);
    } else {
      logMethod(`${prefix} ${entry.message}`);
    }

    if (entry.context) {
      console.debug(`${prefix} Context:`, entry.context);
    }
  }

  /**
   * Get appropriate console method for log level
   */
  private getConsoleMethod(level: LogLevel): typeof console.log {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
        return console.error;
      default:
        return console.log;
    }
  }

  /**
   * Persist log entry to storage
   */
  private async persistLog(entry: LogEntry): Promise<void> {
    try {
      // Get existing logs
      const stored = await LocalStorage.getItem(STORAGE_KEYS.DEBUG_LOG);
      const logs = stored && typeof stored === "string" ? JSON.parse(stored) : [];

      // Add new log
      logs.unshift({
        ...entry,
        timestamp: entry.timestamp.toISOString(), // Serialize date
      });

      // Keep only recent logs
      const maxStoredLogs = 500;
      if (logs.length > maxStoredLogs) {
        logs.splice(maxStoredLogs);
      }

      // Save back to storage
      await LocalStorage.setItem(STORAGE_KEYS.DEBUG_LOG, JSON.stringify(logs));
    } catch (error) {
      console.error("Failed to persist log:", error);
    }
  }

  /**
   * Get recent logs
   */
  static getRecentLogs(count = 50, level?: LogLevel): LogEntry[] {
    let filteredLogs = this.logs;

    if (level !== undefined) {
      filteredLogs = this.logs.filter((log) => log.level >= level);
    }

    return filteredLogs.slice(0, count);
  }

  /**
   * Get logs by category
   */
  static getLogsByCategory(category: string, count = 50): LogEntry[] {
    return this.logs.filter((log) => log.category === category).slice(0, count);
  }

  /**
   * Search logs by message content
   */
  static searchLogs(query: string, count = 50): LogEntry[] {
    const lowerQuery = query.toLowerCase();
    return this.logs
      .filter(
        (log) => log.message.toLowerCase().includes(lowerQuery) || log.category.toLowerCase().includes(lowerQuery),
      )
      .slice(0, count);
  }

  /**
   * Clear all logs
   */
  static async clearLogs(): Promise<void> {
    this.logs = [];

    try {
      await LocalStorage.removeItem(STORAGE_KEYS.DEBUG_LOG);
    } catch (error) {
      console.error("Failed to clear persisted logs:", error);
    }
  }

  /**
   * Export logs as JSON
   */
  static exportLogs(): string {
    return JSON.stringify(
      {
        exported: new Date().toISOString(),
        count: this.logs.length,
        logs: this.logs,
      },
      null,
      2,
    );
  }

  /**
   * Get log statistics
   */
  static getLogStats(): {
    total: number;
    byLevel: Record<string, number>;
    byCategory: Record<string, number>;
    recent: number;
  } {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentLogs = this.logs.filter((log) => log.timestamp > oneHourAgo);

    const byLevel: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    for (const log of this.logs) {
      const levelName = LogLevel[log.level];
      byLevel[levelName] = (byLevel[levelName] || 0) + 1;
      byCategory[log.category] = (byCategory[log.category] || 0) + 1;
    }

    return {
      total: this.logs.length,
      byLevel,
      byCategory,
      recent: recentLogs.length,
    };
  }
}

/**
 * Create logger for specific category
 */
export function createLogger(category: string): Logger {
  return new Logger(category);
}

/**
 * Performance measurement utility
 */
export class PerformanceLogger {
  private static measurements: Map<string, number> = new Map();
  private static logger = new Logger("Performance");

  /**
   * Start timing an operation
   */
  static start(operation: string): void {
    this.measurements.set(operation, Date.now());
  }

  /**
   * End timing and log the duration
   */
  static end(operation: string, data?: Record<string, unknown>): number {
    const startTime = this.measurements.get(operation);
    if (!startTime) {
      this.logger.warn(`No start time found for operation: ${operation}`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.measurements.delete(operation);

    this.logger.performance(operation, duration, data);
    return duration;
  }

  /**
   * Measure async function execution time
   */
  static async measure<T>(operation: string, fn: () => Promise<T>, data?: Record<string, unknown>): Promise<T> {
    this.start(operation);
    try {
      const result = await fn();
      this.end(operation, { ...data, success: true });
      return result;
    } catch (error) {
      this.end(operation, { ...data, success: false, error: error instanceof Error ? error.message : "Unknown error" });
      throw error;
    }
  }

  /**
   * Get performance statistics
   */
  static getStats(): {
    averages: Record<string, number>;
    counts: Record<string, number>;
  } {
    const logs = Logger.getLogsByCategory("Performance");
    const averages: Record<string, number> = {};
    const counts: Record<string, number> = {};

    for (const log of logs) {
      if (log.data?.duration && typeof log.data.duration === "number") {
        const operation = log.message.split(" took ")[0].replace("Performance: ", "");
        const duration = log.data.duration;

        if (!averages[operation]) {
          averages[operation] = 0;
          counts[operation] = 0;
        }

        averages[operation] = (averages[operation] * counts[operation] + duration) / (counts[operation] + 1);
        counts[operation]++;
      }
    }

    return { averages, counts };
  }
}

// Create commonly used loggers
export const mainLogger = createLogger("Main");
export const acpLogger = createLogger("ACP");
export const uiLogger = createLogger("UI");
export const storageLogger = createLogger("Storage");
export const configLogger = createLogger("Config");
