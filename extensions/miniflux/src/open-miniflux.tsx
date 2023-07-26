import { getPreferenceValues, open, popToRoot } from "@raycast/api";

export default async function OpenMiniflux() {
  const { baseUrl }: Preferences = getPreferenceValues();
  baseUrl ? open(baseUrl) : popToRoot();
}
