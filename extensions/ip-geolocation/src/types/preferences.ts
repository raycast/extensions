import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  language: string;
  showIPv6: boolean;
  coordinatesFormat: "latLon" | "lonLat";
}

export const { language, showIPv6, coordinatesFormat } = getPreferenceValues<Preferences>();

export interface CopyIpArguments {
  ipType: string;
  ipVersion: string;
}

export enum IpType {
  LOCAL = "Local",
  PUBLIC = "Public",
}

export enum IpVersion {
  IPV4 = "IPv4",
  IPV6 = "IPv6",
}
