import { Clipboard, Toast, showToast, showHUD } from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";

import * as fs from "fs";
import * as path from "path";

interface Preferences {
  jsonFilePath: string;
}

export default async function Command() {
  const preferences = await getPreferenceValues<Preferences>();

  if (!preferences.jsonFilePath) {
    showToast(Toast.Style.Failure, "No JSON file set");
    return;
  }

  const jsonData = JSON.parse(fs.readFileSync(preferences.jsonFilePath, "utf8"));
  if (!jsonData) {
    showToast(Toast.Style.Failure, "Failed to read JSON file");
    return;
  }

  const key = await Clipboard.readText();
  if (!key) {
    showToast(Toast.Style.Failure, "No key in clipboard");
    return;
  }

  key.trim();
  const value = jsonData[key];
  if (!value) {
    showToast(Toast.Style.Failure, "Key not found");
    return;
  }

  Clipboard.copy(value);
  showHUD("Copied value to clipboard");
}

async function readJson(filePath: string): Promise<{ [key: string]: any } | null> {
  try {
    const data = fs.readFileSync(path.resolve(__dirname, filePath), "utf8");
    return JSON.parse(data);
  } catch (err) {
    return null;
  }
}
