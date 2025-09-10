import { getPreferenceValues } from "@raycast/api";

export interface CanvasPreferences {
  canvasUrl: string;
  apiToken: string;
}

export function getCanvasPreferences(): CanvasPreferences {
  return getPreferenceValues<CanvasPreferences>();
}
