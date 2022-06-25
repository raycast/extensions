import { getPreferenceValues } from "@raycast/api";

export function shouldShowListWithDetails(): boolean {
  const pref = getPreferenceValues();
  const val: boolean | undefined = pref.listwithdetail as boolean;
  if (val === undefined) {
    return true;
  }
  return val;
}

export function useV2(): boolean {
  const pref = getPreferenceValues();
  if (pref.oauthclientid && pref.oauthclientid.length > 0) {
    return true;
  }
  return false;
}
