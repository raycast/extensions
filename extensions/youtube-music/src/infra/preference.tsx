import { getPreferenceValues, Application, showToast, Toast, openExtensionPreferences } from "@raycast/api";
import type { UrlPreference } from "../utils";

interface RawPreferences {
  browser: Application;
  urlPreference: UrlPreference;
  ffRewSeconds: string;
  renderInterval: string;
}

interface Preferences {
  browser: Application;
  urlPreference: UrlPreference;
  ffRewSeconds: number;
}

interface NowPlayingConfig extends Preferences {
  renderInterval: number;
}

export function getPreferences(): Preferences {
  const rawPreferences = getPreferenceValues<RawPreferences>();

  return {
    ...rawPreferences,
    ffRewSeconds: parseNumber("ffRewSeconds", rawPreferences.ffRewSeconds),
  };
}

export function getNowPlayingConfig(): NowPlayingConfig {
  const rawPreferences = getPreferenceValues<RawPreferences>();
  const preferences = getPreferences();

  return {
    ...preferences,
    renderInterval: parseNumber("renderInterval", rawPreferences.renderInterval),
  };
}

function parseNumber(name: string, value: string): number {
  const parsed = parseInt(value, 10);
  if (!Number.isNaN(parsed)) {
    return parsed;
  }

  showToast({
    title: `Invalid ${name} value`,
    message: `Please set a valid number of ${name}`,
    style: Toast.Style.Failure,
    primaryAction: {
      onAction: openExtensionPreferences,
      title: "Set seconds",
    },
  });

  return 0;
}
