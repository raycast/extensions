import { getPreferenceValues } from "@raycast/api";
import {
  normalizePreferences,
  type Config,
  type RawPreferences,
} from "./preferences";

/** Read and normalize the Raycast preferences into typed {@link Config}. */
export function getConfig(): Config {
  return normalizePreferences(getPreferenceValues<RawPreferences>());
}

export type { Config };
