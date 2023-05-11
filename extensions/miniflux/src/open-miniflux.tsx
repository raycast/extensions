import { getPreferenceValues, open } from "@raycast/api";
import { Preferences } from "./utils/types";

export default async function OpenMiniflux() {
  const { baseUrl }: Preferences = getPreferenceValues<Preferences>();
  open(baseUrl);
}
