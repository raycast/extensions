import {
  open,
  showToast,
  Toast,
  showHUD,
  getPreferenceValues,
} from "@raycast/api";
import { homedir } from "os";
import path from "path";
import fs from "fs";

// Ghostty checks these paths in order
const CONFIG_PATHS = [
  // XDG config (Linux style, also works on macOS)
  path.join(homedir(), ".config", "ghostty", "config"),
  // macOS Application Support
  path.join(
    homedir(),
    "Library",
    "Application Support",
    "com.mitchellh.ghostty",
    "config",
  ),
];

export default async function Command() {
  const preferences = getPreferenceValues<Preferences.OpenConfig>();

  // Find existing config file
  let configPath: string | null = null;
  for (const p of CONFIG_PATHS) {
    if (fs.existsSync(p)) {
      configPath = p;
      break;
    }
  }

  if (!configPath) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No config file found",
      message: "Run Ghostty once to generate the default config",
    });
    return;
  }

  try {
    if (preferences.editor && preferences.editor !== "default") {
      await open(configPath, preferences.editor);
    } else {
      await open(configPath);
    }
    await showHUD(`Opened ${configPath.replace(homedir(), "~")}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open config",
      message: String(error),
    });
  }
}
