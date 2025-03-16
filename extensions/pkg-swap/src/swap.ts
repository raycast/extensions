import { getPreferenceValues } from "@raycast/api";
import { convertCommand, PackageManager } from "./lib/converter";
import { showFailureToast } from "@raycast/utils";

interface Preferences {
  defaultPackageManager: PackageManager;
}

export default async function command() {
  try {
    // Get user's preferred package manager from preferences
    const preferences = getPreferenceValues<Preferences>();
    const packageManager = preferences.defaultPackageManager;

    await convertCommand("npm", packageManager);
  } catch (error) {
    showFailureToast("Failed to convert package manager command", error);
  }
}
