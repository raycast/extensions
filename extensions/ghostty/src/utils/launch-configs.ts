import { LocalStorage } from "@raycast/api";

import type { LaunchConfig, PaneConfig } from "./types";
import { parseLaunchConfig } from "./launch-config-parser";

export { parseLaunchConfig } from "./launch-config-parser";

export interface StoredLaunchConfig {
  key: string;
  name: string;
  yaml: string;
  config: LaunchConfig;
}

export async function loadStoredLaunchConfigs(options?: {
  directoryOverrideCompatibleOnly?: boolean;
}): Promise<StoredLaunchConfig[]> {
  const items = await LocalStorage.allItems();
  const configs: StoredLaunchConfig[] = [];

  for (const [key, yaml] of Object.entries(items)) {
    if (typeof yaml !== "string") {
      continue;
    }

    try {
      const config = parseLaunchConfig(yaml);
      if (options?.directoryOverrideCompatibleOnly && !isDirectoryOverrideCompatible(config)) {
        continue;
      }

      configs.push({ key, name: config.name, yaml, config });
    } catch {
      continue;
    }
  }

  return configs.sort((a, b) => a.name.localeCompare(b.name));
}

export function validateLaunchConfigYaml(value?: string): string | undefined {
  if (!value) {
    return "YAML is required";
  }

  try {
    parseLaunchConfig(value);
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : "Invalid YAML format";
  }
}

export async function saveLaunchConfig(previousKey: string | undefined, yaml: string): Promise<string> {
  const config = parseLaunchConfig(yaml);
  const nextKey = getLaunchConfigStorageKey(config.name);

  if (previousKey && previousKey !== nextKey) {
    await LocalStorage.removeItem(previousKey);
  }

  await LocalStorage.setItem(nextKey, yaml);
  return nextKey;
}

export async function removeLaunchConfig(key: string): Promise<void> {
  await LocalStorage.removeItem(key);
}

export function getLaunchConfigStorageKey(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, "-");
}

export function isDirectoryOverrideCompatible(config: LaunchConfig): boolean {
  return getUniqueCwds(config).size <= 1;
}

function getUniqueCwds(config: LaunchConfig): Set<string> {
  const cwds = new Set<string>();

  for (const window of config.windows) {
    for (const tab of window.tabs) {
      collectPaneCwds(tab.layout, cwds);
    }
  }

  return cwds;
}

function collectPaneCwds(pane: PaneConfig, cwds: Set<string>): void {
  const cwd = pane.cwd?.trim();
  if (cwd) {
    cwds.add(cwd);
  }

  for (const childPane of pane.panes ?? []) {
    collectPaneCwds(childPane, cwds);
  }
}
