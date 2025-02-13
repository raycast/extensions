import { getPreferenceValues, open, PreferenceValues } from "@raycast/api";

export default async function OpenMiniflux() {
  const { baseUrl }: PreferenceValues = getPreferenceValues();

  if (baseUrl) {
    open(baseUrl);
  }

  return null;
}
