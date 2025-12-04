/**
 * Simple logging module, sets log output level based on environment.
 */
const isDev = process.env.NODE_ENV !== "production";

export enum LogLevel {
  DEBUG,
  INFO,
  WARN,
  ERROR,
}

let currentLogLevel = isDev ? LogLevel.DEBUG : LogLevel.ERROR;

export function setLogLevel(level: LogLevel) {
  currentLogLevel = level;
}

function log(level: LogLevel, ...args: any[]) {
  if (level >= currentLogLevel) {
    switch (level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.log(...args);
        break;
      case LogLevel.WARN:
        console.warn(...args);
        break;
      case LogLevel.ERROR:
        console.error(...args);
        break;
      default:
        console.error("Unknown log level:", level, ...args);
    }
  }
}

export const logger = {
  debug: (...args: any[]) => log(LogLevel.DEBUG, ...args),
  info: (...args: any[]) => log(LogLevel.INFO, ...args),
  warn: (...args: any[]) => log(LogLevel.WARN, ...args),
  error: (...args: any[]) => log(LogLevel.ERROR, ...args),
};
