import { getPreferenceValues, open } from "@raycast/api";

export default async function OpenMiniflux() {
  const { baseUrl }: Preferences = getPreferenceValues<Preferences>();
  open(baseUrl);
}
