import { environment } from "@raycast/api";

function stringify(value: unknown): string {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value, null, 2);
}

interface Logger {
  log(...args: unknown[]): void;
  error(...args: unknown[]): void;
  createLog(name: string): Logger;
}

export function createLog(name: string): Logger {
  return {
    log(...args: unknown[]) {
      if (environment.isDevelopment) {
        console.log(`AudioCast log: [${name}]`, ...args.map(stringify));
      }
    },
    error(...args: unknown[]) {
      if (environment.isDevelopment) {
        console.error(`AudioCast error: [${name}]`, ...args.map(stringify));
      }
    },
    createLog(childName: string) {
      return createLog(`${name}:${childName}`);
    },
  };
}
