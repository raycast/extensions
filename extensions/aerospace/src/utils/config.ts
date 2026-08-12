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

// `workspace next` / `workspace prev` are relative motions rather than workspace names.
const WORKSPACE_MOTIONS = new Set(["next", "prev"]);

function parseWorkspaceName(command: string): string | null {
  if (!command.startsWith("workspace ")) return null;

  const args = command
    .slice("workspace ".length)
    .trim()
    .split(/\s+/)
    .filter((arg) => !arg.startsWith("-"));

  if (args.length !== 1) return null;
  return WORKSPACE_MOTIONS.has(args[0]) ? null : args[0];
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
        const name = parseWorkspaceName(cmd);
        if (name && !workspaceKeys[name]) workspaceKeys[name] = key;
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
