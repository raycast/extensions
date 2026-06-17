import { getPreferenceValues } from "@raycast/api";
import { Profile, ClaudeCodeConfig } from "../types";
import { readClaudeConfig, writeClaudeConfig, backupClaudeConfig } from "./config";
import { setActiveProfileId } from "./cc-switch-db";

/**
 * Switch to a different profile
 */
export async function switchToProfile(profile: Profile): Promise<void> {
  const preferences = getPreferenceValues<Preferences>();
  const configPath = preferences.configPath || undefined;

  try {
    // Backup current config if enabled
    if (preferences.autoBackup) {
      try {
        await backupClaudeConfig(configPath);
      } catch (error) {
        // Don't fail if backup fails, just log it
        console.warn("Backup failed:", error);
      }
    }

    // Write new config
    await writeClaudeConfig(profile.config, configPath);

    // Update active profile in storage
    await setActiveProfileId(profile.id);
  } catch (error) {
    throw new Error(`Failed to switch profile: ${(error as Error).message}`);
  }
}

/**
 * Load current config from file into a profile
 */
export async function loadCurrentConfig(configPath?: string): Promise<ClaudeCodeConfig> {
  return readClaudeConfig(configPath);
}
