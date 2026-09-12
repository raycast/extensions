import { getPreferenceValues } from "@raycast/api";

export function shouldShowListWithDetails(): boolean {
  const pref = getPreferenceValues();
  const val: boolean | undefined = pref.listwithdetail as boolean;
  if (val === undefined) {
    return true;
  }
  return val;
}
