import type { Preferences } from "../schemas";
import { expandPath } from "./expandPath";

export function resolveLeaderKeyConfigPath(preferences: Preferences): string | null {
  const configuredPath = preferences.leaderKeyConfigPath?.trim();

  if (!configuredPath) {
    return null;
  }

  return expandPath(configuredPath);
}
