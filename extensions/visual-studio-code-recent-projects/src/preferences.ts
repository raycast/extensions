import { getPreferenceValues } from "@raycast/api";
import { Preferences, VSCodeBuild } from "./types";

export const preferences: Preferences = getPreferenceValues();

export const layout = preferences.layout;

export function getBundleIdentifier() {
  switch (preferences.build) {
    case VSCodeBuild.Code:
      return "com.microsoft.VSCode";
    case VSCodeBuild.Insiders:
      return "com.microsoft.VSCodeInsiders";
    case VSCodeBuild.VSCodium:
      return "VSCodium";
  }
}
