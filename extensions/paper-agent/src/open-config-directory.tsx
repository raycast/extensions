import { getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import * as fs from "node:fs";
import * as path from "node:path";

export default async function Command() {
  const prefs = getPreferenceValues<Preferences.OpenConfigDirectory>();
  const configPath = prefs.configPath?.trim() ?? "";

  if (!configPath) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Config path required",
      message: "Set 'Config File Path' in extension preferences.",
    });
    return;
  }

  const configDir = path.dirname(configPath);
  if (!fs.existsSync(configDir)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Folder not found",
      message: configDir,
    });
    return;
  }

  await open(configDir);
  await showToast({
    style: Toast.Style.Success,
    title: "Opened config directory",
    message: configDir,
  });
}
