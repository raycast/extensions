import { getPreferenceValues } from "@raycast/api";

export function useStoragePath(): string {
  return getPreferenceValues<{
    storagePath: string;
  }>().storagePath;
}
