/**
 * Logger utility that only logs in development environments
 */
class Logger {
  private isDevelopment = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "dev";

  private shouldLog(): boolean {
    return this.isDevelopment;
  }

  /**
   * Basic log method
   */
  log(...args: unknown[]): void {
    if (this.shouldLog()) {
      console.log(...args);
    }
  }

  /**
   * Info level logging
   */
  info(...args: unknown[]): void {
    if (this.shouldLog()) {
      console.info(...args);
    }
  }

  /**
   * Error level logging
   */
  error(...args: unknown[]): void {
    if (this.shouldLog()) {
      console.error(...args);
    }
  }

  /**
   * Warning level logging
   */
  warn(...args: unknown[]): void {
    if (this.shouldLog()) {
      console.warn(...args);
    }
  }

  /**
   * Debug level logging
   */
  debug(...args: unknown[]): void {
    if (this.shouldLog()) {
      console.debug(...args);
    }
  }

  /**
   * Group logging for better organization
   */
  group(...args: unknown[]): void {
    if (this.shouldLog()) {
      console.group(...args);
    }
  }

  /**
   * End group logging
   */
  groupEnd(): void {
    if (this.shouldLog()) {
      console.groupEnd();
    }
  }

  /**
   * Table logging for structured data
   */
  table(data: unknown): void {
    if (this.shouldLog()) {
      console.table(data);
    }
  }

  /**
   * Time logging for performance measurement
   */
  time(label: string): void {
    if (this.shouldLog()) {
      console.time(label);
    }
  }

  /**
   * End time logging
   */
  timeEnd(label: string): void {
    if (this.shouldLog()) {
      console.timeEnd(label);
    }
  }
}

// Export a singleton instance
export const logger = new Logger();

// Also export the class for testing or custom instances
export { Logger };
