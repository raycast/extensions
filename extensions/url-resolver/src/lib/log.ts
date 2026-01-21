import { environment } from "@raycast/api";

export function debugLog(...args: unknown[]) {
  if (environment.isDevelopment) {
    console.log(...args);
  }
}
