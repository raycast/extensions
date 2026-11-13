import { getPreferenceValues } from "@raycast/api";
import { resolveBinary } from "./convt";

export function getBinary() {
  return resolveBinary(getPreferenceValues<Preferences>().binaryPath);
}
