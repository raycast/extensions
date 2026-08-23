import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { getPreferenceValues } from "@raycast/api";
import yaml from "js-yaml";

function getDefaultConfigPath(): string {
  if (process.platform === "win32") {
    const appData = process.env.APPDATA ?? join(homedir(), "AppData", "Roaming");
    const localAppData = process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local");
    const candidates = [join(appData, "tabby", "config.yaml"), join(localAppData, "tabby", "config.yaml")];
    return candidates.find(existsSync) ?? candidates[0];
  }
  return join(homedir(), "Library", "Application Support", "tabby", "config.yaml");
}

export function getConfigPath(): string {
  const { configPath } = getPreferenceValues<Preferences>();
  return configPath && configPath.trim().length > 0 ? configPath : getDefaultConfigPath();
}

export interface TabbyProfile {
  id: string;
  name: string;
  type: string;
  group?: string;
  icon?: string;
}

interface TabbyConfig {
  profiles?: TabbyProfile[];
  groups?: Array<{ id: string; name: string }>;
}

export function getTabbyProfiles(): TabbyProfile[] {
  const configPath = getConfigPath();
  if (!existsSync(configPath)) {
    console.error("Tabby config file not found at:", configPath);
    return [];
  }

  try {
    const fileContent = readFileSync(configPath, "utf-8");
    const config = yaml.load(fileContent) as TabbyConfig;

    if (!config.profiles || !Array.isArray(config.profiles)) {
      return [];
    }

    return config.profiles.map((profile) => ({
      id: profile.id || crypto.randomUUID(),
      name: profile.name || "Unnamed Profile",
      type: profile.type || "local",
      group: profile.group,
      icon: profile.icon,
    }));
  } catch (error) {
    console.error("Failed to read Tabby profiles:", error);
    return [];
  }
}

export function getProfileGroups(): Map<string, string> {
  const configPath = getConfigPath();
  if (!existsSync(configPath)) {
    return new Map();
  }

  try {
    const fileContent = readFileSync(configPath, "utf-8");
    const config = yaml.load(fileContent) as TabbyConfig;

    const groupMap = new Map<string, string>();
    if (config.groups && Array.isArray(config.groups)) {
      for (const group of config.groups) {
        groupMap.set(group.id, group.name);
      }
    }
    return groupMap;
  } catch {
    return new Map();
  }
}
