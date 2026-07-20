import fs from "fs/promises";
import path from "path";
import os from "os";
import { parse } from "smol-toml";
import { aerospace } from "./aerospace";

export type AppConfig = {
  mode?: Record<string, ModeConfig>;
};

export type ModeConfig = {
  binding?: Record<string, string | string[]>;
};

export type Shortcut = {
  mode: string;
  key: string;
  command: string;
};

export async function getConfigPath(): Promise<string> {
  let configPath = await aerospace("config", "--config-path");
  if (configPath.startsWith("~")) {
    configPath = path.join(os.homedir(), configPath.slice(1));
  }
  return configPath;
}

export async function loadConfig(): Promise<AppConfig> {
  const configPath = await getConfigPath();
  const content = await fs.readFile(configPath, "utf-8");
  return parse(content) as unknown as AppConfig;
}

export function extractWorkspaceKeys(config: AppConfig): Record<string, string> {
  const workspaceKeys: Record<string, string> = {};
  if (!config.mode) return workspaceKeys;

  for (const [, modeConfig] of Object.entries(config.mode)) {
    const bindings = modeConfig.binding;
    if (!bindings) continue;

    for (const [key, value] of Object.entries(bindings)) {
      const commands = Array.isArray(value) ? value : [value];
      for (const cmd of commands) {
        if (cmd.startsWith("workspace ")) {
          const name = cmd.slice("workspace ".length).trim();
          if (!workspaceKeys[name]) workspaceKeys[name] = key;
        }
      }
    }
  }

  return workspaceKeys;
}

export function extractShortcuts(config: AppConfig): Shortcut[] {
  const shortcuts: Shortcut[] = [];
  if (!config.mode) return shortcuts;

  for (const [mode, modeConfig] of Object.entries(config.mode)) {
    const bindings = modeConfig.binding;
    if (!bindings) continue;

    for (const [key, value] of Object.entries(bindings)) {
      if (Array.isArray(value) && value.length === 0) continue;
      const command = Array.isArray(value) ? value.join(", ") : value;
      if (!command) continue;
      shortcuts.push({ mode, key, command });
    }
  }

  return shortcuts;
}
