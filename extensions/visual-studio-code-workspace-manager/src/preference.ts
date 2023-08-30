import { getPreferenceValues } from "@raycast/api";
import { Preferences, VSCodeBuild } from "./types";

const preferences: Preferences = getPreferenceValues();

export function getBundleIdentifier() {
  switch (preferences.build) {
    case VSCodeBuild.Code:
      return "com.microsoft.VSCode";
    case VSCodeBuild.Insiders:
      return "com.microsoft.VSCodeInsiders";
    case VSCodeBuild.VSCodium:
      return "com.vscodium";
    case VSCodeBuild.VSCodiumMinor:
      return "com.visualstudio.code.oss";
  }
}

export const build = preferences.build;
export const bundleIdentifier = getBundleIdentifier();
export const workspacePath = preferences.workspacePath;
