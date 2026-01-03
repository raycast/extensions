import { getPreferenceValues } from "@raycast/api";
import { existsSync, readFileSync } from "fs";
import * as fsPromises from "fs/promises";
import { homedir } from "os";
import type { BetterAliasesConfig, LeaderKeyAction, LeaderKeyConfig, Preferences } from "../types";
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
    return JSON.parse(configContent) as LeaderKeyConfig;
  } catch (error) {
    console.error("Error reading Leader Key config:", error);
    return null;
  }
}

function traverseActions(actions: LeaderKeyAction[], currentPath: string = ""): BetterAliasesConfig {
  const config: BetterAliasesConfig = {};

  for (const action of actions) {
    const fullPath = currentPath + action.key;

    if (action.type === "group" && action.actions) {
      // Recursively traverse nested actions
      const nestedConfig = traverseActions(action.actions, fullPath);
      Object.assign(config, nestedConfig);
    } else if (action.value) {
      // Add leaf action to config with value and label
      config[fullPath] = {
        value: action.value,
        label: action.label,
      };
    }
  }

  return config;
}

export function convertLeaderKeyConfigToAliases(leaderKeyConfig: LeaderKeyConfig): BetterAliasesConfig {
  return traverseActions(leaderKeyConfig.actions || []);
}

export function getLeaderKeyAliases(): BetterAliasesConfig {
  const leaderKeyConfig = getLeaderKeyConfig();

  if (!leaderKeyConfig) {
    return {};
  }

  return convertLeaderKeyConfigToAliases(leaderKeyConfig);
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
    return JSON.parse(configContent) as LeaderKeyConfig;
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

  return convertLeaderKeyConfigToAliases(leaderKeyConfig);
}
