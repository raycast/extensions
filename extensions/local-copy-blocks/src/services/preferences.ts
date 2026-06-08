import { getPreferenceValues } from "@raycast/api";
import path from "path";
import type { ConfiguredBlockSet, BlockSetConfig, BlockSetId } from "../types";

const BLOCK_SET_COMMAND_TITLES: Record<BlockSetId, string> = {
  1: "Block Set 1",
  2: "Block Set 2",
  3: "Block Set 3",
};

export function getPreferences(): ExtensionPreferences {
  return getPreferenceValues<ExtensionPreferences>();
}

export function getBlockSetConfig(blockSetId: BlockSetId): BlockSetConfig {
  const preferences = getPreferences();
  const directory = getDirectoryPreference(preferences, blockSetId);
  const isEnabled = getEnabledPreference(preferences, blockSetId);
  const displayName =
    getDisplayNamePreference(preferences, blockSetId) ||
    getDirectoryName(directory) ||
    BLOCK_SET_COMMAND_TITLES[blockSetId];

  return {
    id: blockSetId,
    commandTitle: BLOCK_SET_COMMAND_TITLES[blockSetId],
    displayName,
    isEnabled,
    directory,
  };
}

export function getConfiguredBlockSetConfig(blockSetId: BlockSetId): ConfiguredBlockSet | undefined {
  const config = getBlockSetConfig(blockSetId);
  if (!config.isEnabled || !config.directory) {
    return undefined;
  }

  return {
    ...config,
    directory: config.directory,
  };
}

export function getConfiguredBlockSetConfigs(): ConfiguredBlockSet[] {
  return ([1, 2, 3] as const)
    .map((blockSetId) => getConfiguredBlockSetConfig(blockSetId))
    .filter((config): config is ConfiguredBlockSet => Boolean(config));
}

function getEnabledPreference(preferences: ExtensionPreferences, blockSetId: BlockSetId): boolean {
  switch (blockSetId) {
    case 1:
      return preferences.folder1Enabled !== false;
    case 2:
      return preferences.folder2Enabled !== false;
    case 3:
      return preferences.folder3Enabled !== false;
  }
}

function getDirectoryPreference(preferences: ExtensionPreferences, blockSetId: BlockSetId): string | undefined {
  switch (blockSetId) {
    case 1:
      return preferences.folder1Directory;
    case 2:
      return preferences.folder2Directory;
    case 3:
      return preferences.folder3Directory;
  }
}

function getDisplayNamePreference(preferences: ExtensionPreferences, blockSetId: BlockSetId): string | undefined {
  switch (blockSetId) {
    case 1:
      return preferences.folder1DisplayName?.trim();
    case 2:
      return preferences.folder2DisplayName?.trim();
    case 3:
      return preferences.folder3DisplayName?.trim();
  }
}

function getDirectoryName(directory: string | undefined): string | undefined {
  if (!directory) {
    return undefined;
  }

  return path.basename(directory);
}
