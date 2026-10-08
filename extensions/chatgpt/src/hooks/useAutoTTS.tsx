import { getPreferenceValues } from "@raycast/api";

export function useAutoTTS(): boolean {
  return getPreferenceValues<{
    isAutoTTS: boolean;
  }>().isAutoTTS;
}
