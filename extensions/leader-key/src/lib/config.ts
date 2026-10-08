import { getPreferenceValues } from "@raycast/api";
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import type { LeaderKeyConfig } from "../types";

const DEFAULT_CONFIG_PATH = `${homedir()}/Library/Application Support/Leader Key/config.json`;

export function expandPath(path: string): string {
  if (!path) return path;
  return path.replace(/\$\{?HOME\}?/g, homedir()).replace(/^~/, homedir());
}

export function getLeaderKeyConfig(): LeaderKeyConfig | null {
  const preferences = getPreferenceValues<Preferences>();
  const configPath = preferences.leaderKeyConfigPath
    ? expandPath(preferences.leaderKeyConfigPath)
    : DEFAULT_CONFIG_PATH;

  if (!existsSync(configPath)) {
    throw new Error(`Leader Key config not found at: ${configPath}`);
  }

  const content = readFileSync(configPath, "utf8");

  try {
    return JSON.parse(content) as LeaderKeyConfig;
  } catch {
    throw new Error(`Invalid Leader Key config JSON at: ${configPath}`);
  }
}
