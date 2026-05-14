import { getPreferenceValues } from "@raycast/api";
import path from "path";
import type { ConfiguredPromptSet, PromptSetConfig, PromptSetId } from "../types";

const PROMPT_SET_COMMAND_TITLES: Record<PromptSetId, string> = {
  1: "Prompt Set 1",
  2: "Prompt Set 2",
  3: "Prompt Set 3",
};

export function getPreferences(): ExtensionPreferences {
  return getPreferenceValues<ExtensionPreferences>();
}

export function getPromptSetConfig(promptSetId: PromptSetId): PromptSetConfig {
  const preferences = getPreferences();
  const directory = getDirectoryPreference(preferences, promptSetId);
  const isEnabled = getEnabledPreference(preferences, promptSetId);
  const displayName =
    getDisplayNamePreference(preferences, promptSetId) ||
    getDirectoryName(directory) ||
    PROMPT_SET_COMMAND_TITLES[promptSetId];

  return {
    id: promptSetId,
    commandTitle: PROMPT_SET_COMMAND_TITLES[promptSetId],
    displayName,
    isEnabled,
    directory,
  };
}

export function getConfiguredPromptSetConfig(promptSetId: PromptSetId): ConfiguredPromptSet | undefined {
  const config = getPromptSetConfig(promptSetId);
  if (!config.isEnabled || !config.directory) {
    return undefined;
  }

  return {
    ...config,
    directory: config.directory,
  };
}

export function getConfiguredPromptSetConfigs(): ConfiguredPromptSet[] {
  return ([1, 2, 3] as const)
    .map((promptSetId) => getConfiguredPromptSetConfig(promptSetId))
    .filter((config): config is ConfiguredPromptSet => Boolean(config));
}

function getEnabledPreference(preferences: ExtensionPreferences, promptSetId: PromptSetId): boolean {
  switch (promptSetId) {
    case 1:
      return preferences.folder1Enabled !== false;
    case 2:
      return preferences.folder2Enabled !== false;
    case 3:
      return preferences.folder3Enabled !== false;
  }
}

function getDirectoryPreference(preferences: ExtensionPreferences, promptSetId: PromptSetId): string | undefined {
  switch (promptSetId) {
    case 1:
      return preferences.folder1Directory;
    case 2:
      return preferences.folder2Directory;
    case 3:
      return preferences.folder3Directory;
  }
}

function getDisplayNamePreference(preferences: ExtensionPreferences, promptSetId: PromptSetId): string | undefined {
  switch (promptSetId) {
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
