import path from "path";
import { randomUUID } from "crypto";
import { readFile, writeFile, access, mkdir } from "fs/promises";

import { environment } from "@raycast/api";
import { ExtensionConfig, Project } from "../types";
import { WECHAT_DEVTOOL_CLI_PATH } from "../constants";

const CONFIG_DIR = environment.supportPath;
const CONFIG_PATH = path.resolve(CONFIG_DIR, "config-v2.json");

async function ensureConfigDir() {
  try {
    await access(CONFIG_DIR);
  } catch {
    await mkdir(CONFIG_DIR, { recursive: true });
  }
}

export async function getExtensionConfig(): Promise<ExtensionConfig> {
  try {
    await ensureConfigDir();
    try {
      const content = await readFile(CONFIG_PATH, "utf8");
      return JSON.parse(content);
    } catch {
      // File doesn't exist, return default config
      return {
        cliPath: WECHAT_DEVTOOL_CLI_PATH,
        projects: [],
      };
    }
  } catch (error) {
    console.error("Failed to load config:", error);
    return {
      cliPath: WECHAT_DEVTOOL_CLI_PATH,
      projects: [],
    };
  }
}

export async function updateExtensionConfig(config: ExtensionConfig) {
  try {
    await ensureConfigDir();
    await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error("Failed to save config:", error);
    throw error;
  }
}

export function generateUUID() {
  return randomUUID();
}

export function createEmptyProject(): Project {
  return {
    id: generateUUID(),
    name: "",
    path: "",
    lastUsedAt: Date.now(),
    aliases: [],
  };
}

export async function updateProjectLastUsed(projectId: string) {
  const config = await getExtensionConfig();
  const project = config.projects.find((project) => project.id === projectId);
  if (project) {
    project.lastUsedAt = Date.now();
    await updateExtensionConfig(config);
  }
}

export function parseProjectAliasesString(aliasesString: string) {
  if (!aliasesString || !aliasesString.trim()) {
    return [];
  }
  return aliasesString
    .split(",")
    .map((alias) => alias.trim())
    .filter((alias) => alias.length > 0);
}

export function formatProjectAliasesString(aliasesArray: string[]) {
  return aliasesArray.join(", ");
}
