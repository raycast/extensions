import type { QuickShellSettings, TerminalApplication } from "./schema";
import { DEFAULT_SETTINGS } from "./schema";
import { isMacPlatform } from "./platform";
import { recentCountFromEnabled } from "./settings";
import {
  normalizeDefaultProfile,
  normalizeTerminalApplicationForPlatform,
  parseTerminalApplication,
} from "./terminal-options";

export type ExtensionPreferences = {
  terminalApplication?: TerminalApplication;
  defaultProfile?: string;
  showRecents?: boolean;
  singleWindowTabs?: boolean;
  blockDirtyBranchSwitch?: boolean;
};

export function preferencesToSettings(prefs: ExtensionPreferences): QuickShellSettings {
  const terminalApplication = parseTerminalApplication(prefs.terminalApplication);
  const profileTerminal = resolveProfileTerminal(terminalApplication);
  const defaultProfile = normalizeDefaultProfile(
    profileTerminal,
    prefs.defaultProfile?.trim() || DEFAULT_SETTINGS.defaultProfile,
  );

  return {
    terminalApplication,
    defaultProfile,
    recentWorkspaceCount: recentCountFromEnabled(prefs.showRecents ?? true),
    multiLaunchPresentation: isMacPlatform()
      ? "separateWindows"
      : (prefs.singleWindowTabs ?? true)
        ? "singleWindowTabs"
        : "separateWindows",
    blockDirtyBranchSwitch: prefs.blockDirtyBranchSwitch ?? DEFAULT_SETTINGS.blockDirtyBranchSwitch,
  };
}

function resolveProfileTerminal(terminalApplication: TerminalApplication): TerminalApplication {
  const normalized = normalizeTerminalApplicationForPlatform(terminalApplication);
  if (normalized === "system") {
    return isMacPlatform() ? "terminal" : "wt";
  }
  return normalized;
}
