import { getPreferenceValues } from "@raycast/api";
import { OsType } from "./devices";

export function getSettings() {
  return getPreferenceValues<Preferences>();
}

/** Platforms turned on in the preferences, like the Platforms settings of Expo Orbit. */
export function isOsTypeEnabled(osType: OsType): boolean {
  const settings = getSettings();
  switch (osType) {
    case "iOS":
      return settings.showIos;
    case "Android":
      return settings.showAndroid;
    case "tvOS":
      return settings.showTvos;
    case "watchOS":
      return settings.showWatchos;
  }
}

export function getAndroidSdkPath(): string | undefined {
  return getSettings().androidSdkPath?.trim() || undefined;
}

/** The trusted sources from the preferences, e.g. `https://example.com/*`. */
export function getTrustedSources(): string[] {
  return (getSettings().trustedSources ?? "")
    .split(",")
    .map((source) => source.trim())
    .filter(Boolean);
}
