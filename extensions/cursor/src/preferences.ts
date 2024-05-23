import { getPreferenceValues } from "@raycast/api";
import { VSCodeBuild } from "./types";

const preferences = getPreferenceValues<ExtensionPreferences>();

function getBundleIdentifier() {
  switch (preferences.build) {
    case VSCodeBuild.Cursor:
      return "Cursor";
  }
}

export const build = preferences.build;
export const bundleIdentifier = getBundleIdentifier();
export const layout = preferences.layout;
export const keepSectionOrder = preferences.keepSectionOrder;
export const closeOtherWindows = preferences.closeOtherWindows;
export const terminalApp = preferences.terminalApp;
