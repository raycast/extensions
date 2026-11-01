import { getPreferenceValues } from "@raycast/api";
import { expandHomePath } from "./ghq/command";

export function getGHQRootPath() {
  return expandHomePath(getPreferenceValues<Preferences>().GHQ_ROOT_PATH);
}
