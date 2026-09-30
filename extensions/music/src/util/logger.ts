import { environment } from "@raycast/api";

export const logScript = (script: string): string => {
  // Prevent log in production
  if (!environment.isDevelopment) return script;

  console.debug(script);

  return script;
};
