import { homedir } from "node:os";
import { getPreferenceValues } from "@raycast/api";
import type { ResolvePeonPingPathsInput } from "./peon-ping-paths";

export function getResolvePeonPingPathsInputFromPreferences(): ResolvePeonPingPathsInput {
  const prefs = getPreferenceValues<Preferences.TogglePeonPing>();
  return {
    raycastClaudeConfigDir: prefs.claudeConfigDir ?? null,
    claudeConfigDirEnv: process.env.CLAUDE_CONFIG_DIR ?? null,
    homeDir: homedir(),
  };
}
