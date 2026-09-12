import { getPreferenceValues } from "@raycast/api";
import { accessSync, constants } from "fs";

export const getBrewExecutablePath = (packageName: string) => {
  const preferences: { kubensPath: string } = getPreferenceValues();

  if (preferences.kubensPath) {
    return preferences.kubensPath;
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
