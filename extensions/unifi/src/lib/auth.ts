import { getPreferenceValues } from "@raycast/api";

export function hasAuth() {
  const preferences = getPreferenceValues();
  return !!preferences.apiKey && !!preferences.controllerUrl;
}

export function isLegacy() {
  const preferences = getPreferenceValues();
  return !!preferences.username && !!preferences.password && !!preferences.controllerUrl && !preferences.apiKey;
}

export function getAuthPreferences() {
  const preferences = getPreferenceValues();
  return {
    apiKey: preferences.apiKey,
    host: preferences.host,
    username: preferences.username,
    password: preferences.password,
    controllerUrl: preferences.controllerUrl,
  };
}
