import { getPreferenceValues } from "@raycast/api";

export function useUrl(path: string) {
  const { dataRegionURL } = getPreferenceValues();
  return `${dataRegionURL}/${path}`;
}
