import { getPreferenceValues } from "@raycast/api";
import type { CapturePosition, CaptureType } from "./nodes";

export type OpenWorkflowyLocationTarget = "app" | "web";

export interface ExtensionPreferences {
  apiKey: string;
  cacheStaleMinutes?: string;
  capturePosition?: CapturePosition;
  quickCaptureDefaultTarget?: string;
  quickCaptureDefaultType?: CaptureType;
  viewDefaultTarget?: string;
  openWorkflowyLocationTarget?: OpenWorkflowyLocationTarget;
}

export interface NormalizedPreferences {
  apiKey: string;
  cacheStaleMinutes: number;
  capturePosition: CapturePosition;
  quickCaptureDefaultTarget: string;
  quickCaptureDefaultType: CaptureType;
  viewDefaultTarget: string;
  openWorkflowyLocationTarget: OpenWorkflowyLocationTarget;
}

export function getPreferences(): NormalizedPreferences {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const apiKey = preferences.apiKey?.trim();
  const staleMinutes = Number.parseInt(preferences.cacheStaleMinutes?.trim() || "60", 10);
  const capturePosition = preferences.capturePosition === "bottom" ? "bottom" : "top";
  const quickCaptureDefaultTarget = preferences.quickCaptureDefaultTarget?.trim() || "inbox";
  const quickCaptureDefaultType = preferences.quickCaptureDefaultType === "bullet" ? "bullet" : "todo";
  const viewDefaultTarget = preferences.viewDefaultTarget?.trim() || "inbox";
  const openWorkflowyLocationTarget = preferences.openWorkflowyLocationTarget === "web" ? "web" : "app";

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
