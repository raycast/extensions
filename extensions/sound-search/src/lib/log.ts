import { environment } from "@raycast/api";

type LogFunction = (...args: unknown[]) => void;

const noop: LogFunction = () => {};

export const debug: LogFunction = environment.isDevelopment ? (...args) => console.debug(...args) : noop;

export const info: LogFunction = (...args) => console.info(...args);
export const warn: LogFunction = (...args) => console.warn(...args);
export const error: LogFunction = (...args) => console.error(...args);

export const log = {
  debug,
  info,
  warn,
  error,
};

export type Logger = typeof log;
