import fs from "fs/promises";
import os from "os";
import path from "path";
import { parse } from "smol-toml";
import { AeroSpaceError, aerospace } from "./aerospace";

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

export type ConfigSnapshot = {
  path: string;
  raw: string;
  loadedConfig: AppConfig | null;
  loadedConfigError: Error | null;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

export function parseAppConfig(value: unknown): AppConfig {
  if (!isRecord(value)) throw new Error("Expected the AeroSpace config to be an object.");
  if (value.mode === undefined) return {};
  if (!isRecord(value.mode)) throw new Error('Expected the AeroSpace config "mode" value to be an object.');

  const modes: Record<string, ModeConfig> = {};
  for (const [modeName, modeValue] of Object.entries(value.mode)) {
    if (!isRecord(modeValue)) throw new Error(`Expected mode "${modeName}" to be an object.`);
    if (modeValue.binding === undefined) {
      modes[modeName] = {};
      continue;
    }
    if (!isRecord(modeValue.binding)) {
      throw new Error(`Expected bindings for mode "${modeName}" to be an object.`);
    }

    const bindings: Record<string, string | string[]> = {};
    for (const [key, command] of Object.entries(modeValue.binding)) {
      const validCommand =
        typeof command === "string" ||
        (Array.isArray(command) && command.every((entry): entry is string => typeof entry === "string"));
      if (!validCommand) throw new Error(`Expected binding "${modeName}.${key}" to contain command strings.`);
      bindings[key] = command;
    }
    modes[modeName] = { binding: bindings };
  }

  return { mode: modes };
}

export function parseLoadedConfigJson(output: string): AppConfig {
  try {
    return parseAppConfig(JSON.parse(output));
  } catch (error) {
    throw new AeroSpaceError(
      `Could not parse the config loaded by AeroSpace: ${toError(error).message}`,
      "invalid-response",
      { cause: error },
    );
  }
}

export async function loadLoadedConfig(): Promise<AppConfig> {
  return parseLoadedConfigJson(await aerospace("config", "--get", ".", "--json"));
}

export async function getConfigPath(): Promise<string> {
  const configPath = await aerospace("config", "--config-path");
  return configPath.startsWith("~") ? path.join(os.homedir(), configPath.slice(1)) : configPath;
}

export async function loadConfigSnapshot(): Promise<ConfigSnapshot> {
  const configPath = await getConfigPath();
  const [raw, loadedResult] = await Promise.all([
    fs.readFile(configPath, "utf8"),
    loadLoadedConfig().then(
      (config) => ({ config, error: null }),
      (error: unknown) => ({ config: null, error: toError(error) }),
    ),
  ]);

  return {
    path: configPath,
    raw,
    loadedConfig: loadedResult.config,
    loadedConfigError: loadedResult.error,
  };
}

export async function loadConfig(): Promise<AppConfig> {
  try {
    return await loadLoadedConfig();
  } catch (error) {
    if (error instanceof AeroSpaceError && error.kind !== "command-failed") throw error;
    const configPath = await getConfigPath();
    return parseAppConfig(parse(await fs.readFile(configPath, "utf8")));
  }
}

// `workspace next` / `workspace prev` are relative motions rather than workspace names.
const WORKSPACE_MOTIONS = new Set(["next", "prev"]);

function parseWorkspaceName(command: string): string | null {
  if (!command.startsWith("workspace ")) return null;

  const args = command
    .slice("workspace ".length)
    .trim()
    .split(/\s+/)
    .filter((argument) => argument !== "--" && !argument.startsWith("-"));

  if (args.length !== 1) return null;
  return WORKSPACE_MOTIONS.has(args[0]) ? null : args[0];
}

export function extractWorkspaceKeys(config: AppConfig): Record<string, string> {
  const workspaceKeys: Record<string, string> = {};
  if (!config.mode) return workspaceKeys;

  for (const modeConfig of Object.values(config.mode)) {
    const bindings = modeConfig.binding;
    if (!bindings) continue;

    for (const [key, value] of Object.entries(bindings)) {
      const commands = Array.isArray(value) ? value : [value];
      for (const command of commands) {
        const name = parseWorkspaceName(command);
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
      if (command) shortcuts.push({ mode, key, command });
    }
  }

  return shortcuts;
}
