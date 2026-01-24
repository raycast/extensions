/**
 * Hook to initialize Claude CLI configuration from Raycast preferences
 */

import { useEffect } from "react";
import { getPreferenceValues } from "@raycast/api";
import { initClaudePath } from "../lib/claude-cli";

interface ClaudePreferences {
  claudePath: string;
}

export function useClaudeConfig() {
  useEffect(() => {
    // Get preferences and initialize Claude CLI path
    const preferences = getPreferenceValues<ClaudePreferences>();
    initClaudePath(preferences.claudePath);
  }, []);
}
