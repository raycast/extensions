import { formatDuration, intervalToDuration } from "date-fns";
import type { ClientType } from "./unifi/types/client";

export const dateToHumanReadable = (date: Date | string): string => {
  return formatDuration(intervalToDuration({ start: new Date(date), end: new Date() }));
};

export const connectionTypeIcon = (type: ClientType) => {
  switch (type) {
    case "WIRED":
      return "port.svg";
    case "WIRELESS":
      return "wifi.svg";
    case "VPN":
      return "vpn.svg";
    case "TELEPORT":
      return "sparkles.svg";
    default:
      return "port.svg";
  }
};

export const ipToNumber = (ip: string): number => {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
};

export const camelCaseToWords = (str: string): string => {
  return str
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

export const formatSpeed = (speedMbps: number): string => {
  if (!speedMbps) return "0 Mbps";

  if (speedMbps >= 1000) {
    const gbps = speedMbps / 1000;
    return `${Number.isInteger(gbps) ? gbps : gbps.toFixed(1)} Gbps`;
  }

  return `${speedMbps} Mbps`;
};
