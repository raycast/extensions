// Logging utility for the Rewiser extension

// Determine if we're in development mode
const isDevelopment = process.env.NODE_ENV === "development";

// Log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// Current log level (only show logs at this level or higher)
const currentLogLevel = isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;

// Utility function to format log messages
function formatMessage(level: string, message: string, data?: unknown): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}] [Rewiser]`;

  if (data) {
    try {
      return `${prefix} ${message} ${JSON.stringify(data)}`;
    } catch {
      return `${prefix} ${message} [Circular/Non-serializable data]`;
    }
  }

  return `${prefix} ${message}`;
}

// Logger implementation
export const logger = {
  // Debug logs (only in development)
  debug: (message: string, data?: unknown) => {
    if (currentLogLevel <= LogLevel.DEBUG && isDevelopment) {
      console.log(formatMessage("DEBUG", message, data));
    }
  },

  // Info logs
  info: (message: string, data?: unknown) => {
    if (currentLogLevel <= LogLevel.INFO) {
      console.log(formatMessage("INFO", message, data));
    }
  },

  // Warning logs
  warn: (message: string, data?: unknown) => {
    if (currentLogLevel <= LogLevel.WARN) {
      console.warn(formatMessage("WARN", message, data));
    }
  },

  // Error logs (always shown)
  error: (message: string, error?: unknown) => {
    if (currentLogLevel <= LogLevel.ERROR) {
      console.error(formatMessage("ERROR", message, error));
    }
  },

  // API request logging (only in development)
  apiRequest: (method: string, url: string, data?: unknown) => {
    if (isDevelopment) {
      logger.debug(`API Request: ${method} ${url}`, data);
    }
  },

  // API response logging (only in development)
  apiResponse: (url: string, status: number, data?: unknown) => {
    if (isDevelopment) {
      logger.debug(`API Response: ${url} - ${status}`, data);
    }
  },

  // API error logging
  apiError: (url: string, error: unknown) => {
    logger.error(`API Error: ${url}`, error);
  },
};

// Export a function to manually enable debug mode (useful for testing)
export function enableDebugMode() {
  Object.assign(logger, {
    debug: (message: string, data?: unknown) => {
      console.log(formatMessage("DEBUG", message, data));
    },
  });
}

// Performance logging utility
export class PerformanceLogger {
  private startTime: number;
  private operation: string;

  constructor(operation: string) {
    this.operation = operation;
    this.startTime = performance.now();
    logger.debug(`Started: ${operation}`);
  }

  finish(additionalInfo?: string) {
    const duration = performance.now() - this.startTime;
    const message = `Completed: ${this.operation} (${duration.toFixed(2)}ms)`;
    logger.debug(additionalInfo ? `${message} - ${additionalInfo}` : message);
  }
}
