import { getPreferenceValues } from "@raycast/api";
import { accessSync, constants } from "fs";

export const getBrewExecutablePath = (packageName: string) => {
  const preferences: { kubectxPath: string } = getPreferenceValues();

  if (preferences.kubectxPath) {
    return preferences.kubectxPath;
  }

  const possiblePaths = [`/usr/local/bin/${packageName}`, `/opt/homebrew/bin/${packageName}`];

  let validPath = packageName;

  possiblePaths.some((path) => {
    try {
      accessSync(path, constants.X_OK);

      validPath = path;

      return true;
    } catch (e) {
      return false;
    }
  });

  return validPath;
};
