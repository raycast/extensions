import { getPreferenceValues, open } from "@raycast/api";

export default async function OpenMiniflux() {
  const { baseUrl }: Preferences = getPreferenceValues();

  if (baseUrl) {
    open(baseUrl);
  }

  return null;
}
