import axios from "axios";
import { Bonjour } from "bonjour-service";
import { setTimeout } from "timers";
import tinycolor from "tinycolor2";
import { HsvWithName } from "../types";

export interface DiscoveredDevice {
  name: string;
  address: string;
  port: number;
}

export async function discoverNanoleafDevices(timeoutMs = 3000): Promise<DiscoveredDevice[]> {
  const bonjour = new Bonjour();
  const found = new Map<string, DiscoveredDevice>();

  return new Promise((resolve) => {
    let browser: ReturnType<typeof bonjour.find>;
    try {
      browser = bonjour.find({ type: "nanoleafapi", protocol: "tcp" }, (service) => {
        const ipv4 = service.addresses?.find((addr) => isValidIPv4(addr));
        if (!ipv4) return;
        const key = `${service.name}@${ipv4}`;
        if (!found.has(key)) {
          found.set(key, { name: service.name, address: ipv4, port: service.port });
        }
      });
    } catch {
      bonjour.destroy();
      resolve([]);
      return;
    }

    setTimeout(() => {
      browser.stop();
      bonjour.destroy();
      resolve([...found.values()]);
    }, timeoutMs);
  });
}

const IPV4_REGEX = /^(25[0-5]|2[0-4]\d|[01]?\d?\d)(\.(25[0-5]|2[0-4]\d|[01]?\d?\d)){3}$/;

export function isValidIPv4(value: string): boolean {
  return IPV4_REGEX.test(value.trim());
}

export function getPairingErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED") {
      return "Connection timed out. Make sure your device is on the same network and try again.";
    }
    if (error.code === "ENETUNREACH" || error.code === "ECONNREFUSED" || error.code === "EHOSTUNREACH") {
      return "Couldn't reach the device. Double-check the IP address.";
    }
    if (error.response?.status === 403) {
      return "Device isn't in pairing mode. Hold the power button until the LED flashes, then try again.";
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Pairing failed for an unknown reason.";
}

export function createHsvColorWithName(color: tinycolor.ColorFormats.HSV): HsvWithName {
  const colorObj = tinycolor(color);
  const colorName = colorObj.toName() || colorObj.toHexString();

  const hsvColorWithName: HsvWithName = {
    hsv: color,
    name: colorName,
  };

  return hsvColorWithName;
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
