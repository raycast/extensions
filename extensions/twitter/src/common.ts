import { getPreferenceValues } from "@raycast/api";

export function shouldShowListWithDetails(): boolean {
  const pref = getPreferenceValues();
  return (pref.listwithdetail as boolean) || true;
}
