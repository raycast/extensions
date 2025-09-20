import { getPreferenceValues } from "@raycast/api";
import { getClientId } from "./v2/lib/oauth";

export function shouldShowListWithDetails(): boolean {
  const pref = getPreferenceValues();
  const val: boolean | undefined = pref.listwithdetail as boolean;
  if (val === undefined) {
    return true;
  }
  return val;
}

export function useV2(): boolean {
  return true; // v1 does not work anymore with X
  /*const pref = getPreferenceValues();
  const appKey = (pref.appkey as string) || "";
  const appSecret = (pref.appsecret as string) || "";
  const accessToken = (pref.accesstoken as string) || "";
  const accessSecret = (pref.accesssecret as string) || "";
  if (appKey.length > 0 || appSecret.length > 0 || accessToken.length > 0 || accessSecret.length > 0) {
    console.log("use v1");
    return false;
  }
  console.log("use v2");
  return true;*/
}

export function hasRestrictedAccess() {
  const ci = getClientId();
  if (!ci || ci === "" || ci === "-") {
    return true;
  }
  return false;
}
