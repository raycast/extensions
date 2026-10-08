import { environment, getPreferenceValues } from "@raycast/api";
import { icondir } from "../constants";
import { Service } from "./service";

const iconLookupKeys = [
  "logo",
  "accountType",
  "name",
  "issuer",
] as (keyof Service)[];

const { fallbackIconColor } = getPreferenceValues<{
  fallbackIconColor: string;
}>();

export function icon(otp: Service) {
  if (otp === undefined || otp.logo === null) {
    return `${environment.assetsPath}/${icondir}/authenticator_${fallbackIconColor}.png`;
  }

  // otp.logo should be base64 and otp.logo_mime should be the mime type
  if (otp.logo != null && otp.logo_mime != null) {
    const icon = `data:${otp.logo_mime};base64,${otp.logo}`;
    return icon;
  }

  return `${environment.assetsPath}/${icondir}/authenticator_${fallbackIconColor}.png`;
}
