import { getPreferenceValues } from "@raycast/api";

export enum InstallationSource {
  AppStore = "appstore",
  SetApp = "setapp",
}

interface Preferences {
  fileExtension: string;
  installationSource: InstallationSource;
}

export const getPreferences = (): Preferences => {
  return getPreferenceValues<Preferences>();
};
