/**
 * Minimal leveled logger. Kept dependency-free so it can be used from any layer
 * and easily silenced in tests. The active level defaults to `warn` but can be
 * lowered via the `REPOSCOUT_LOG_LEVEL` environment variable during development.
 *
 * We never silently swallow failures anywhere in the codebase; instead callers
 * log through this module so that behavior is observable and testable.
 */

export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

function resolveInitialLevel(): LogLevel {
  const fromEnv = process.env.REPOSCOUT_LOG_LEVEL as LogLevel | undefined;
  if (fromEnv && fromEnv in LEVEL_WEIGHT) {
    return fromEnv;
  }
  return "warn";
}

let activeLevel: LogLevel = resolveInitialLevel();

/** Override the active log level (primarily for tests and development). */
export function setLogLevel(level: LogLevel): void {
  activeLevel = level;
}

/** Get the active log level. */
export function getLogLevel(): LogLevel {
  return activeLevel;
}

function enabled(level: LogLevel): boolean {
  return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[activeLevel];
}

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Create a logger that prefixes every line with a scope, e.g. `[indexer]`.
 * Scopes make it easy to trace which layer produced a message.
 */
export function createLogger(scope: string): Logger {
  const prefix = `[reposcout:${scope}]`;
  return {
    debug: (message, ...args) => {
      if (enabled("debug")) console.warn(prefix, message, ...args);
    },
    info: (message, ...args) => {
      if (enabled("info")) console.warn(prefix, message, ...args);
    },
    warn: (message, ...args) => {
      if (enabled("warn")) console.warn(prefix, message, ...args);
    },
    error: (message, ...args) => {
      if (enabled("error")) console.error(prefix, message, ...args);
    },
  };
}
