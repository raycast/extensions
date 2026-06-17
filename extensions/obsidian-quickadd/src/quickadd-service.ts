import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { homedir } from "node:os";
import { getPreferenceValues } from "@raycast/api";
import {
  buildQuickAddUri,
  extractChoices,
  getQuickAddConfigPath,
  normalizeVariableName,
  normalizeVaults,
  type QuickAddChoiceWithVault,
  type QuickAddState,
  type Vault,
} from "./quickadd-core";

export {
  buildQuickAddUri,
  extractChoices,
  getQuickAddConfigPath,
  normalizeVariableName,
  type QuickAddChoiceWithVault,
  type QuickAddState,
  type Vault,
};

export function getDefaultVariableName() {
  const preferences = getPreferenceValues<Preferences>();
  return normalizeVariableName(preferences.defaultVariableName);
}

export function getObsidianConfigPath() {
  return join(homedir(), "Library", "Application Support", "obsidian", "obsidian.json");
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const contents = await readFile(filePath, "utf8");
  return JSON.parse(contents) as T;
}

export async function detectVaults(configPath = getObsidianConfigPath()): Promise<Vault[]> {
  if (!existsSync(configPath)) return [];

  const config = await readJsonFile<{ vaults?: Record<string, { path?: string; open?: boolean; ts?: number }> }>(
    configPath,
  );
  return normalizeVaults(config.vaults);
}

export async function resolveVaults(): Promise<Vault[]> {
  const preferences = getPreferenceValues<Preferences>();
  const preferencePath = String(preferences.vaultPath || "").trim();

  if (preferencePath) {
    const vaultName = basename(preferencePath);

    return [
      {
        id: vaultName,
        name: vaultName,
        path: preferencePath,
        open: false,
        ts: 0,
      },
    ];
  }

  const vaults = await detectVaults();
  if (vaults.length === 0) {
    throw new Error("No Obsidian vault was detected. Set a Vault Path in the extension preferences.");
  }

  return vaults;
}

export async function loadQuickAddState(): Promise<QuickAddState> {
  const vaults = await resolveVaults();
  const choices: QuickAddChoiceWithVault[] = [];
  const errors: string[] = [];

  for (const vault of vaults) {
    const configPath = getQuickAddConfigPath(vault.path);
    if (!existsSync(configPath)) continue;

    try {
      const data = await readJsonFile<unknown>(configPath);
      choices.push(...extractChoices(data).map((choice) => ({ ...choice, vault })));
    } catch (error) {
      errors.push(`${vault.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  choices.sort(
    (a, b) =>
      a.name.localeCompare(b.name, "zh-Hans-CN") ||
      a.vault.name.localeCompare(b.vault.name, "zh-Hans-CN") ||
      a.group.localeCompare(b.group, "zh-Hans-CN"),
  );

  if (choices.length === 0) {
    const message =
      errors.length > 0
        ? `No QuickAdd choices could be loaded. ${errors.join("; ")}`
        : "No QuickAdd choices were found in the selected vault.";
    throw new Error(message);
  }

  return {
    vaults,
    choices,
    refreshedAt: new Date().toISOString(),
  };
}
