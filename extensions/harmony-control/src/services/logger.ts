import { LogLevel, LogEntry, ILogger, LoggerOptions } from "../types/logging";
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  debugLogging: boolean;
}

/**
 * Logger implementation with static methods for application-wide logging.
 * Follows singleton pattern to ensure consistent logging across the application.
 */
export class Logger implements ILogger {
  private static instance: Logger | null = null;
  private readonly options: LoggerOptions;
  private logHistory: LogEntry[] = [];

  private constructor(options: Partial<LoggerOptions> = {}) {
    const prefs = getPreferenceValues<Preferences>();
    this.options = {
      minLevel: prefs.debugLogging ? LogLevel.DEBUG : LogLevel.INFO,
      maxEntries: options.maxEntries || 1000,
    };
  }

  /**
   * Get singleton instance of Logger
   */
  private static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Format a log message with timestamp and context
   */
  private static formatMessage(level: LogLevel, message: string, ...args: (string | number | boolean | object | null | undefined)[]): string {
    const timestamp = new Date().toISOString();
    const pid = process.pid;
    const formattedArgs = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    return `${timestamp} [pid:${pid}] ${level}: ${message} ${formattedArgs}`.trim();
  }

  /**
   * Format a log message with timestamp and context
   */
  private formatMessage(level: LogLevel, message: string, data?: unknown): LogEntry {
    const formattedMessage = Logger.formatMessage(
      level,
      message,
      data as string | number | boolean | object | null | undefined
    );
    
    const entry: LogEntry = {
      level,
      message: formattedMessage,
      timestamp: new Date().toISOString()
    };

    // Add to history and maintain max entries
    this.logHistory.push(entry);
    if (this.logHistory.length > this.options.maxEntries!) {
      this.logHistory.shift();
    }

    // Always output to console for development
    const levelStr = LogLevel[level].padEnd(5);
    console.log(formattedMessage);

    return entry;
  }

  /**
   * Log at DEBUG level
   */
  public debug(message: string, data?: unknown): void {
    if (this.options.minLevel! <= LogLevel.DEBUG) {
      const entry = this.formatMessage(LogLevel.DEBUG, message, data);
    }
  }

  /**
   * Log at INFO level
   */
  public info(message: string, data?: unknown): void {
    if (this.options.minLevel! <= LogLevel.INFO) {
      const entry = this.formatMessage(LogLevel.INFO, message, data);
      console.info(entry.message, entry.data || "");
    }
  }

  /**
   * Log at WARN level
   */
  public warn(message: string, data?: unknown): void {
    if (this.options.minLevel! <= LogLevel.WARN) {
      const entry = this.formatMessage(LogLevel.WARN, message, data);
      console.warn(entry.message, entry.data || "");
    }
  }

  /**
   * Log at ERROR level
   */
  public error(message: string, data?: unknown): void {
    if (this.options.minLevel! <= LogLevel.ERROR) {
      const entry = this.formatMessage(LogLevel.ERROR, message, data);
      console.error(entry.message, entry.data || "");
    }
  }

  /**
   * Log an error with stack trace
   */
  public logError(error: Error, context?: string): void {
    const message = context ? `${context}: ${error.message}` : error.message;
    const data = {
      name: error.name,
      stack: error.stack,
      error: error,
    };
    this.error(message, data);
  }

  /**
   * Get log history
   */
  public getHistory(): LogEntry[] {
    return this.logHistory;
  }

  /**
   * Clear log history
   */
  public clearHistory(): void {
    this.logHistory = [];
  }

  /**
   * Set minimum log level
   */
  public setMinLevel(level: LogLevel): void {
    this.options.minLevel = level;
  }

  // Static methods that delegate to instance methods

  public static debug(message: string, data?: unknown): void {
    Logger.getInstance().debug(message, data);
  }

  public static info(message: string, data?: unknown): void {
    Logger.getInstance().info(message, data);
  }

  public static warn(message: string, data?: unknown): void {
    Logger.getInstance().warn(message, data);
  }

  public static error(message: string, data?: unknown): void {
    Logger.getInstance().error(message, data);
  }

  public static logError(error: Error, context?: string): void {
    Logger.getInstance().logError(error, context);
  }

  public static getLogHistory(): LogEntry[] {
    return Logger.getInstance().getHistory();
  }

  public static clearLogHistory(): void {
    Logger.getInstance().clearHistory();
  }

  public static setLogLevel(level: LogLevel): void {
    Logger.getInstance().setMinLevel(level);
  }
}
