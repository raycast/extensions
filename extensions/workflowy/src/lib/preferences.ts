import { getPreferenceValues } from "@raycast/api";

export function getPreferences() {
  const preferences = getPreferenceValues<Preferences>();
  const apiKey = preferences.apiKey?.trim();
  const staleMinutes = Number.parseInt(preferences.cacheStaleMinutes?.trim() || "60", 10);
  const capturePosition: NonNullable<Preferences["capturePosition"]> = preferences.capturePosition === "bottom" ? "bottom" : "top";
  const quickCaptureDefaultTarget = preferences.quickCaptureDefaultTarget?.trim() || "inbox";
  const quickCaptureDefaultType: NonNullable<Preferences["quickCaptureDefaultType"]> = preferences.quickCaptureDefaultType === "bullet" ? "bullet" : "todo";
  const viewDefaultTarget = preferences.viewDefaultTarget?.trim() || "inbox";
  const openWorkflowyLocationTarget: NonNullable<Preferences["openWorkflowyLocationTarget"]> = preferences.openWorkflowyLocationTarget === "web" ? "web" : "app";

  return {
    apiKey: apiKey ?? "",
    cacheStaleMinutes: Number.isFinite(staleMinutes) && staleMinutes > 0 ? staleMinutes : 60,
    capturePosition,
    quickCaptureDefaultTarget,
    quickCaptureDefaultType,
    viewDefaultTarget,
    openWorkflowyLocationTarget,
  };
}

export function hasApiKey(): boolean {
  return Boolean(getPreferences().apiKey);
}
