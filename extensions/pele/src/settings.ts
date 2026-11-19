import { environment, getPreferenceValues } from "@raycast/api";
import path from "node:path";
import { resolveTheme } from "./lib/themes";

export function getSettings() {
  const preferences = getPreferenceValues<Preferences>();
  return {
    options: {
      theme: resolveTheme(preferences.theme ?? "auto", environment.appearance),
      scale: Number(preferences.scale ?? "2"),
      transparent: preferences.transparent ?? false,
    },
    saveFolder: preferences.saveFolder,
    cachePath: path.join(environment.supportPath, "previews"),
  };
}
