import { getPreferenceValues } from "@raycast/api";
import { existsSync, readFileSync } from "fs";
import * as fsPromises from "fs/promises";
import { homedir } from "os";
import { type BetterAliasesConfig, type LeaderKeyConfig, leaderKeyConfigSchema, type Preferences } from "../schemas";
import { convertLeaderKeyToAliases } from "./conversion";
import { expandPath } from "./expandPath";

const DEFAULT_CONFIG_PATH = `${homedir()}/Library/Application Support/Leader Key/config.json`;

export function getLeaderKeyConfig(): LeaderKeyConfig | null {
  const preferences = getPreferenceValues<Preferences>();
  const leaderKeyConfigPath = preferences.leaderKeyConfigPath
    ? expandPath(preferences.leaderKeyConfigPath)
    : DEFAULT_CONFIG_PATH;

  if (!existsSync(leaderKeyConfigPath)) {
    if (preferences.leaderKeyConfigPath) {
      console.warn(`Leader Key config file not found at: ${leaderKeyConfigPath}`);
    }
    return null;
  }

  try {
    const configContent = readFileSync(leaderKeyConfigPath, "utf8");
    const parsed = JSON.parse(configContent);

    // We use safeParse but we don't return null if it fails -
    // instead we try to recover as much as possible or use the raw data if it's an object
    const result = leaderKeyConfigSchema.safeParse(parsed);
    if (!result.success) {
      console.error("Leader Key config validation warnings:", result.error.format());
      // If it's at least an object with actions, we can try to use it
      if (parsed && typeof parsed === "object" && "actions" in parsed) {
        return parsed as LeaderKeyConfig;
      }
      return null;
    }

    return result.data;
  } catch (error) {
    console.error("Error reading Leader Key config:", error);
    return null;
  }
}

export function getLeaderKeyAliases(): BetterAliasesConfig {
  const leaderKeyConfig = getLeaderKeyConfig();

  if (!leaderKeyConfig) {
    return {};
  }

  return convertLeaderKeyToAliases(leaderKeyConfig);
}

export async function getLeaderKeyConfigAsync(): Promise<LeaderKeyConfig | null> {
  const preferences = getPreferenceValues<Preferences>();
  const leaderKeyConfigPath = preferences.leaderKeyConfigPath
    ? expandPath(preferences.leaderKeyConfigPath)
    : DEFAULT_CONFIG_PATH;

  if (!existsSync(leaderKeyConfigPath)) {
    if (preferences.leaderKeyConfigPath) {
      console.warn(`Leader Key config file not found at: ${leaderKeyConfigPath}`);
    }
    return null;
  }

  try {
    const configContent = await fsPromises.readFile(leaderKeyConfigPath, "utf8");
    const parsed = JSON.parse(configContent);

    const result = leaderKeyConfigSchema.safeParse(parsed);
    if (!result.success) {
      console.error("Leader Key config validation warnings:", result.error.format());
      if (parsed && typeof parsed === "object" && "actions" in parsed) {
        return parsed as LeaderKeyConfig;
      }
      return null;
    }

    return result.data;
  } catch (error) {
    console.error("Error reading Leader Key config:", error);
    return null;
  }
}

export async function getLeaderKeyAliasesAsync(): Promise<BetterAliasesConfig> {
  const leaderKeyConfig = await getLeaderKeyConfigAsync();

  if (!leaderKeyConfig) {
    return {};
  }

  return convertLeaderKeyToAliases(leaderKeyConfig);
}
