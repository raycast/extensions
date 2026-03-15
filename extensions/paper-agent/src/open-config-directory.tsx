import { getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import * as fs from "node:fs";
import * as path from "node:path";

const prefs = getPreferenceValues<Preferences.OpenConfigDirectory>();
const CONFIG_PATH = prefs.configPath?.trim() ?? "";

export default async function Command() {
  if (!CONFIG_PATH) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Config path required",
      message: "Set 'Config file path' in extension preferences.",
    });
    return;
  }

  const configDir = path.dirname(CONFIG_PATH);
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
