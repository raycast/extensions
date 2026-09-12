import { getPreferenceValues } from "@raycast/api";
import { normalizeHost } from "../src/posthog-client";

export function useUrl(path: string) {
  const { dataRegionURL } = getPreferenceValues<Preferences>();
  return `${normalizeHost(dataRegionURL)}/${path}`;
}
