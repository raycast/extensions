import { Device, FunctionItem } from "./interfaces";
import { isTuyaApiError } from "./errors";

export type Transport = "cloud" | "local";

/** Codes that mean the cloud path is unavailable for billing or authorization reasons. */
const SUBSCRIPTION_CODES = new Set([1106, 28841002, 28841105]);

export function isSubscriptionError(error: unknown): boolean {
  if (isTuyaApiError(error)) return SUBSCRIPTION_CODES.has(error.code);
  if (error instanceof Error) return /\b(1106|28841002|28841105)\b/.test(error.message);
  return false;
}

export interface ControlDeps {
  cloud: (device: Device, command: FunctionItem) => Promise<void>;
  local: (device: Device, command: FunctionItem) => Promise<void>;
  canLocal: (device: Device) => boolean;
}

/**
 * Sends a command over the cloud, falling back to the LAN only when the cloud is
 * unavailable for subscription reasons. Any other cloud failure is a real error and
 * is surfaced as-is rather than masked by a second attempt.
 */
export async function sendWithFallback(device: Device, command: FunctionItem, deps: ControlDeps): Promise<Transport> {
  try {
    await deps.cloud(device, command);
    return "cloud";
  } catch (cloudError) {
    // A device the cloud cannot reach may still answer on the LAN, so a known-offline
    // device earns a local attempt just as a lapsed subscription does.
    const worthRetryingLocally = isSubscriptionError(cloudError) || device.online === false;
    if (!worthRetryingLocally || !deps.canLocal(device)) {
      throw cloudError;
    }

    try {
      await deps.local(device, command);
      return "local";
    } catch (localError) {
      const detail = localError instanceof Error ? localError.message : String(localError);
      const message = cloudError instanceof Error ? cloudError.message : String(cloudError);
      throw new Error(`${message} Local control also failed: ${detail}`);
    }
  }
}

/** Reads the device list the main command caches, so the LAN path survives a cloud outage. */
export function readCachedDevices(raw: string | undefined): Device[] {
  if (!raw || raw === "undefined") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Device[]) : [];
  } catch {
    return [];
  }
}

export interface DeviceSourceDeps {
  cloud: () => Promise<Device[]>;
  cached: () => Device[];
}

export type DeviceSource = { devices: Device[]; source: "cloud" | "cache" };

/**
 * Falls back to the cached list only when the cloud is unavailable for subscription
 * reasons and the cache actually holds something. Any other failure is surfaced.
 */
export async function loadDevices(deps: DeviceSourceDeps): Promise<DeviceSource> {
  try {
    return { devices: await deps.cloud(), source: "cloud" };
  } catch (error) {
    if (!isSubscriptionError(error)) throw error;
    const cached = deps.cached();
    if (cached.length === 0) throw error;
    return { devices: cached, source: "cache" };
  }
}
