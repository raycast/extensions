import { open } from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";

export default async function () {
  const { dataRegionURL } = getPreferenceValues();

  await open(dataRegionURL + "/feature_flags");
}
