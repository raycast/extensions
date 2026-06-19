import { execSync } from "child_process";
import { homedir } from "os";
import { existsSync } from "fs";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";

const DEFAULT_CONFIG_FILE = `${homedir()}/Library/Application Support/com.nuebling.mac-mouse-fix/config.plist`;
const PLIST_BUDDY = "/usr/libexec/PlistBuddy";

function getConfigPath(): string {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.customConfigPath?.trim() || DEFAULT_CONFIG_FILE;
}

export function configExists(): boolean {
  const configPath = getConfigPath();
  return existsSync(configPath);
}

export async function showConfigErrorIfNeeded(): Promise<boolean> {
  const preferences = getPreferenceValues<Preferences>();
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    if (preferences.customConfigPath?.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Custom config file not found",
        message: "Check your custom path in preferences",
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Config file not found",
        message: "Please run Mac Mouse Fix at least once",
      });
    }
    return true; // Error was shown
  }

  return false; // No error
}

export function readPlistValue(key: string): string {
  const configPath = getConfigPath();
  try {
    const result = execSync(`"${PLIST_BUDDY}" -c "Print :${key}" "${configPath}"`, {
      encoding: "utf-8",
    });
    return result.trim();
  } catch (error) {
    console.log(error);
    throw new Error(`Could not read ${key} from config file`);
  }
}

export function setPlistValue(key: string, value: string): void {
  const configPath = getConfigPath();
  try {
    execSync(`"${PLIST_BUDDY}" -c "Set :${key} ${value}" "${configPath}"`, {
      stdio: "ignore",
    });
  } catch (error) {
    console.log(error);
    throw new Error(`Could not set ${key} in config file`);
  }
}
