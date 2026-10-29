import { getPreferenceValues } from "@raycast/api";
import { expandHomePath } from "./ghq/command";

export function getGHQRootPath() {
  return expandHomePath(getPreferenceValues<{ GHQ_ROOT_PATH: string }>().GHQ_ROOT_PATH);
}
