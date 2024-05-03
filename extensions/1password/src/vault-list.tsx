import { PreferenceValues, getPreferenceValues } from "@raycast/api";

import { Items as ItemsV7 } from "./v7/components/Items";
import { Items as ItemsV8 } from "./v8/components/Vaults";

export default function Command() {
  return getPreferenceValues<PreferenceValues>().version == "v8" ? <ItemsV8 /> : <ItemsV7 />;
}
