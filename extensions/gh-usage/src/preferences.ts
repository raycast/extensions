import { getPreferenceValues } from "@raycast/api";

export const preferences = getPreferenceValues<Preferences>();

export function getRefreshIntervalMs(): number {
  return parseInt(preferences.refreshInterval || "60", 10) * 1000;
}

export function getGhCommand(): string {
  return preferences.customGhPath || "gh";
}

export function getGhEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH}`,
  };
}
