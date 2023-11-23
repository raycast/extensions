import { getPreferenceValues } from "@raycast/api";
import { Preferences, VSCodeBuild } from "./types";

const preferences: Preferences = getPreferenceValues();

function getBundleIdentifier() {
  switch (preferences.build) {
    case VSCodeBuild.Code:
      return "com.microsoft.VSCode";
    case VSCodeBuild.Insiders:
      return "com.microsoft.VSCodeInsiders";
    case VSCodeBuild.VSCodium:
      return "VSCodium";
    case VSCodeBuild.Cursor:
      return "Cursor";
  }
}

export const build = preferences.build;
export const bundleIdentifier = getBundleIdentifier();
export const layout = preferences.layout;
export const keepSectionOrder = preferences.keepSectionOrder;
export const closeOtherWindows = preferences.closeOtherWindows;
