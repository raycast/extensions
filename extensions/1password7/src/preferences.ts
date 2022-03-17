import { getPreferenceValues } from "@raycast/api";

enum AppVersion {
  Automatic = "automatic",
  V8 = "onepassword8",
  V7 = "onepassword7",
}

const preferences = getPreferenceValues<{ appVersion: AppVersion }>();

export const appVersion = preferences.appVersion === AppVersion.Automatic ? AppVersion.V8 : preferences.appVersion;
