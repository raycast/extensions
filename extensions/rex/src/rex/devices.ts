import { Color, environment, type Image } from "@raycast/api";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";
import type { RexHost } from "./types";

const execFileAsync = promisify(execFile);

/** SF Symbol names Rex uses for hosts; the files in assets/devices carry the same names. */
const DEVICE_ICONS = [
  "macbook",
  "macmini",
  "macstudio",
  "desktopcomputer",
  "macpro.gen3",
  "server.rack",
  "cloud",
  "globe",
] as const;

export type DeviceIcon = (typeof DEVICE_ICONS)[number];

const KNOWN: ReadonlySet<string> = new Set(DEVICE_ICONS);

function isDeviceIcon(name: string | undefined): name is DeviceIcon {
  return name !== undefined && KNOWN.has(name);
}

/** Apple model identifiers that do not say what they are in their name. */
const MODEL_TABLE: Record<string, DeviceIcon> = {
  "Mac13,1": "macstudio",
  "Mac13,2": "macstudio",
  "Mac14,2": "macbook",
  "Mac14,7": "macbook",
  "Mac14,15": "macbook",
  "Mac14,5": "macbook",
  "Mac14,6": "macbook",
  "Mac14,9": "macbook",
  "Mac14,10": "macbook",
  "Mac14,3": "macmini",
  "Mac14,12": "macmini",
  "Mac14,8": "macpro.gen3",
  "Mac14,13": "macstudio",
  "Mac14,14": "macstudio",
  "Mac15,3": "macbook",
  "Mac15,6": "macbook",
  "Mac15,7": "macbook",
  "Mac15,8": "macbook",
  "Mac15,9": "macbook",
  "Mac15,10": "macbook",
  "Mac15,11": "macbook",
  "Mac15,12": "macbook",
  "Mac15,13": "macbook",
  "Mac15,4": "desktopcomputer",
  "Mac15,5": "desktopcomputer",
  "Mac16,1": "macbook",
  "Mac16,5": "macbook",
  "Mac16,6": "macbook",
  "Mac16,7": "macbook",
  "Mac16,8": "macbook",
  "Mac16,12": "macbook",
  "Mac16,13": "macbook",
  "Mac16,2": "desktopcomputer",
  "Mac16,3": "desktopcomputer",
  "Mac16,9": "macstudio",
  "Mac16,10": "macmini",
  "Mac16,11": "macmini",
  "Mac16,15": "macmini",
};

let localDevice: Promise<DeviceIcon> | undefined;

async function run(file: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync(file, args, { timeout: 3000 });
  return stdout.trim();
}

/** Which Mac this is, by model identifier, falling back to "has a battery" for unknown models. */
export function detectLocalDevice(): Promise<DeviceIcon> {
  if (!localDevice) {
    localDevice = (async () => {
      try {
        const model = await run("/usr/sbin/sysctl", ["-n", "hw.model"]);
        if (MODEL_TABLE[model]) return MODEL_TABLE[model];
        if (/^MacBook/i.test(model)) return "macbook";
        if (/^Macmini/i.test(model)) return "macmini";
        if (/^iMac/i.test(model)) return "desktopcomputer";
        if (/^MacPro/i.test(model)) return "macpro.gen3";
        const battery = await run("/usr/bin/pmset", ["-g", "batt"]).catch(() => "");
        return /InternalBattery/.test(battery) ? "macbook" : "desktopcomputer";
      } catch {
        return "macbook";
      }
    })();
  }
  return localDevice;
}

/** Device icon for a host: the detected Mac for this machine, the configured icon for remote hosts. */
export function hostDevice(host: RexHost, local: DeviceIcon | undefined): DeviceIcon {
  if (host.thisMachine) return local ?? "macbook";
  return isDeviceIcon(host.icon) ? host.icon : "globe";
}

export function deviceImage(device: DeviceIcon, tintColor: Color.ColorLike = Color.PrimaryText): Image.ImageLike {
  return { source: join(environment.assetsPath, "devices", `${device}.png`), tintColor };
}
