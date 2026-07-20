/**
 * Module-scoped structured logging with configurable log levels.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

let currentLogLevel: LogLevel = process.env.NODE_ENV === "development" ? LogLevel.DEBUG : LogLevel.WARN;
const LOG_PREFIX = "[renaming]";

export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
}

function formatMessage(level: string, module: string, message: string): string {
  const timestamp = new Date().toISOString();
  return `${LOG_PREFIX} ${timestamp} [${level}] [${module}] ${message}`;
}

function debug(module: string, message: string, data?: unknown): void {
  if (currentLogLevel <= LogLevel.DEBUG) {
    const formatted = formatMessage("DEBUG", module, message);
    if (data !== undefined) {
      console.log(formatted, data);
    } else {
      console.log(formatted);
    }
  }
}

function info(module: string, message: string, data?: unknown): void {
  if (currentLogLevel <= LogLevel.INFO) {
    const formatted = formatMessage("INFO", module, message);
    if (data !== undefined) {
      console.log(formatted, data);
    } else {
      console.log(formatted);
    }
  }
}

function warn(module: string, message: string, data?: unknown): void {
  if (currentLogLevel <= LogLevel.WARN) {
    const formatted = formatMessage("WARN", module, message);
    if (data !== undefined) {
      console.warn(formatted, data);
    } else {
      console.warn(formatted);
    }
  }
}

function error(module: string, message: string, err?: unknown): void {
  if (currentLogLevel <= LogLevel.ERROR) {
    const formatted = formatMessage("ERROR", module, message);
    if (err !== undefined) {
      console.error(formatted, err);
    } else {
      console.error(formatted);
    }
  }
}

export function createLogger(module: string) {
  return {
    debug: (message: string, data?: unknown) => debug(module, message, data),
    info: (message: string, data?: unknown) => info(module, message, data),
    warn: (message: string, data?: unknown) => warn(module, message, data),
    error: (message: string, err?: unknown) => error(module, message, err),
  };
}

export const log = {
  files: createLogger("files"),
  rename: createLogger("rename"),
};
