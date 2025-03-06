import { getPreferenceValues } from "@raycast/api";

export function useBinaryPath(): string {
  return getPreferenceValues<{
    binaryPath: string;
  }>().binaryPath;
}
