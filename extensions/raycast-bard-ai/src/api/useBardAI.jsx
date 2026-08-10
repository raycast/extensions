import Bard from "bard-ai";
import { getPreferenceValues } from "@raycast/api";
export default async function useBardAI() {
  let failed = false;
  const pref = getPreferenceValues();
  try {
    await Bard.init(pref["__Secure-1PSID"]);
  } catch (error) {
    failed = true;
    return failed;
  }
  return failed;
}
