import { format, formatDuration, intervalToDuration } from "date-fns";
import type { ClientType } from "./unifi/types/client";
import type { Device, ListDevice, ListDevices } from "./unifi/types/device";
import { Color, getPreferenceValues, type Image } from "@raycast/api";

interface dateToHumanReadableProps {
  start?: Date | string;
  end?: Date | string;
}

const DEFAULT_DATE_FORMAT = "yyyy-MM-dd HH:mm:ss";

export const dateToHumanReadable = ({ start = new Date(), end = new Date() }: dateToHumanReadableProps): string => {
  return formatDuration(intervalToDuration({ start: new Date(start), end: new Date(end) }));
};

export const secondsToHumanReadable = (seconds: number): string => {
  return formatDuration(intervalToDuration({ start: 0, end: seconds * 1000 }), {
    format: ["days", "hours", "minutes"],
  });
};

export const formatDate = (date: string): string => {
  const preferences = getPreferenceValues<Preferences>();
  return format(new Date(date), preferences.dateFormat || DEFAULT_DATE_FORMAT);
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

export const bpsToHumanReadable = (bps: number): string => {
  if (bps < 1000) return `${bps} bps`;

  const kbps = bps / 1000;
  if (kbps < 1000) return `${kbps.toFixed(1)} Kbps`;

  const mbps = kbps / 1000;
  if (mbps < 1000) return `${mbps.toFixed(1)} Mbps`;

  const gbps = mbps / 1000;
  return `${gbps.toFixed(1)} Gbps`;
};

export const assignUplinkDevice = (device: Device, devices: ListDevices): Device => {
  if (!device.uplink) return device;

  const uplinkDevice = devices.find((dev: ListDevice) => dev.id === device.uplink.deviceId);
  if (uplinkDevice) {
    return { ...device, uplink: { ...device.uplink, deviceName: uplinkDevice.name } };
  }

  return device;
};

export const getDeviceTypeIcon = (device: Device): Image.ImageLike => {
  if (device.features.switching && !device.uplink?.deviceId) {
    return {
      source: "console-icon.svg",
      tintColor: Color.Blue,
    };
  }
  if (device.features.switching) {
    return {
      source: "switch.svg",
      tintColor: Color.Blue,
    };
  }
  if (device.features.accessPoint) {
    return {
      source: "ap-icon.svg",
      tintColor: Color.Blue,
    };
  }
  return "Unknown";
};
