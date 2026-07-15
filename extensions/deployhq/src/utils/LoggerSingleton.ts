import { environment } from "@raycast/api";

// Simplified logger without singleton pattern for better performance
export const Logger = {
  error: (message: string, ...args: unknown[]): void => {
    if (environment.isDevelopment) {
      console.error(`[DeployHQ] ${message}`, ...args);
    }
  },
  info: (message: string, ...args: unknown[]): void => {
    if (environment.isDevelopment) {
      console.log(`[DeployHQ] ${message}`, ...args);
    }
  },
  debug: (message: string, ...args: unknown[]): void => {
    if (environment.isDevelopment) {
      console.debug(`[DeployHQ] ${message}`, ...args);
    }
  },
};
