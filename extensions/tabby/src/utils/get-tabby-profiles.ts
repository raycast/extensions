import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import yaml from "js-yaml";

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

const CONFIG_PATH = join(homedir(), "Library/Application Support/tabby/config.yaml");

export function getTabbyProfiles(): TabbyProfile[] {
  if (!existsSync(CONFIG_PATH)) {
    console.error("Tabby config file not found at:", CONFIG_PATH);
    return [];
  }

  try {
    const fileContent = readFileSync(CONFIG_PATH, "utf-8");
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
  if (!existsSync(CONFIG_PATH)) {
    return new Map();
  }

  try {
    const fileContent = readFileSync(CONFIG_PATH, "utf-8");
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
