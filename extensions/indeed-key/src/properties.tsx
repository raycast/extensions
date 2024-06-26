import { getPreferenceValues } from "@raycast/api";

export const properties = getPreferenceValues<Properties>();

interface Properties {
  deviceID: string;
  qrCodeDeeplink: string;
}
