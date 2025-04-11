import { getPreferenceValues } from "@raycast/api";
import { execSync } from "child_process";

interface Preferences {
  pythonPath?: string;
  apiKey?: string;
}

export function getApiKey() {
  const preferences = getPreferenceValues<Preferences>();
  if (preferences.apiKey) {
    return preferences.apiKey;
  }
}

export async function findPythonInterpreter(): Promise<string> {
  const userPreferences = getPreferenceValues<Preferences>();
  if (userPreferences.pythonPath) {
    if (isValidPython(userPreferences.pythonPath)) {
      return userPreferences.pythonPath.trim();
    } else {
      throw new Error(`Configured Python path (${userPreferences.pythonPath}) is not Python 3.10+`);
    }
  }
  throw new Error(`Please configure a Python 3.10+ path in the Raycast Extension Preferences!`);
}

function isValidPython(cmd: string): boolean {
  try {
    const output = execSync(`${cmd} --version`, { encoding: "utf8" });
    const match = output.match(/Python (\d+)\.(\d+)\.(\d+)/);
    if (!match) return false;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, major, minor] = match;
    return Number(major) > 3 || (Number(major) === 3 && Number(minor) >= 10);
  } catch {
    return false;
  }
}
