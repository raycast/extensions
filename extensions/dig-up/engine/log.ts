import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export interface Log {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

/** Appends timestamped lines to a file (and stderr when `echo`), never throwing. */
export function fileLog(file: string, echo = false): Log {
  try {
    mkdirSync(dirname(file), { recursive: true });
  } catch {
    // the first write reports the problem
  }
  const write = (level: string, message: string) => {
    const line = `${new Date().toISOString()} ${level} ${message}\n`;
    try {
      appendFileSync(file, line);
    } catch {
      // logging must never take the daemon down
    }
    if (echo) process.stderr.write(line);
  };
  return {
    info: (m) => write("info", m),
    warn: (m) => write("warn", m),
    error: (m) => write("error", m),
  };
}

export const consoleLog: Log = {
  info: (m) => process.stderr.write(`info ${m}\n`),
  warn: (m) => process.stderr.write(`warn ${m}\n`),
  error: (m) => process.stderr.write(`error ${m}\n`),
};

export const silentLog: Log = { info: () => {}, warn: () => {}, error: () => {} };
