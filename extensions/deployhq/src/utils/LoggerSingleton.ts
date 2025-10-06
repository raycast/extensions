import { environment } from "@raycast/api";

class LoggerSingleton {
  private static instance: LoggerSingleton | null = null;

  static getInstance(): LoggerSingleton {
    if (LoggerSingleton.instance !== null) return LoggerSingleton.instance;
    LoggerSingleton.instance = new LoggerSingleton();
    return LoggerSingleton.instance;
  }

  error(message: string, ...args: unknown[]): void {
    if (environment.isDevelopment) {
      console.error(`[DeployHQ] ${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (environment.isDevelopment) {
      console.log(`[DeployHQ] ${message}`, ...args);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (environment.isDevelopment) {
      console.debug(`[DeployHQ] ${message}`, ...args);
    }
  }
}

export const Logger = LoggerSingleton.getInstance();
