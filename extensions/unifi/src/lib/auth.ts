import { getPreferenceValues } from "@raycast/api";

export function hasAuth() {
  const preferences = getPreferenceValues();
  return !!preferences.apiKey && !!preferences.controllerUrl;
}

export function isLegacy() {
  const preferences = getPreferenceValues();
  return !!preferences.username && !!preferences.password && !!preferences.controllerUrl;
}

export function getAuthPreferences() {
  const preferences = getPreferenceValues();
  return {
    apiKey: preferences.apiKey,
    username: preferences.username,
    password: preferences.password,
    controllerUrl: preferences.controllerUrl,
  };
}
