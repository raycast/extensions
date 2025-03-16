import { getPreferenceValues } from "@raycast/api";
import { convertCommand, PackageManager } from "./lib/converter";

interface Preferences {
  defaultPackageManager: PackageManager;
}

export default async function command() {
  // Get user's preferred package manager from preferences
  const preferences = getPreferenceValues<Preferences>();
  const packageManager = preferences.defaultPackageManager;

  await convertCommand("npm", packageManager);
}
