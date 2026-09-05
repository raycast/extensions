import { getPreferenceValues } from "@raycast/api";
import { Aggressiveness, TrimConfig, URLQueryParamRule } from "./types";
import { URLQueryParamRules } from "./url-rules";

export interface ExtensionPreferences {
  aggressiveness: Aggressiveness;
  preserveBlankLines: boolean;
  removeBoxDrawing: boolean;
  flattenClaudeCodePrompts: boolean;
  extraUrlKeepRules: string;
}

export function readPreferences(): ExtensionPreferences {
  return getPreferenceValues<ExtensionPreferences>();
}

export function trimConfigFromPrefs(prefs: ExtensionPreferences): TrimConfig {
  return {
    aggressiveness: prefs.aggressiveness,
    preserveBlankLines: prefs.preserveBlankLines,
    removeBoxDrawing: prefs.removeBoxDrawing,
    flattenClaudeCodePrompts: prefs.flattenClaudeCodePrompts,
  };
}

export function urlRulesFromPrefs(prefs: ExtensionPreferences): URLQueryParamRule[] {
  const extra = URLQueryParamRules.parseCustomRules(prefs.extraUrlKeepRules ?? "");
  return [...extra, ...URLQueryParamRules.parseCustomRules(URLQueryParamRules.defaultRulesText)];
}
