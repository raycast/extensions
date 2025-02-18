import { getPreferenceValues, open, PreferenceValues } from "@raycast/api";

export default function OpenMiniflux() {
  const { baseUrl }: PreferenceValues = getPreferenceValues();

  if (baseUrl) {
    open(baseUrl);
  }
}
