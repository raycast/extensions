import { environment } from "@raycast/api";

export const captureException = (description: string, error: any) => {
  if (!environment.isDevelopment) return;
  console.error(description, error);
};

export const debugLog = (...args: any[]) => {
  if (!environment.isDevelopment) return;
  console.debug(...args);
};
