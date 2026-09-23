import TuyaDevice from "tuyapi";
import { Device, FunctionItem } from "./interfaces";

/**
 * The LAN protocol addresses data points by numeric DPS index, while the cloud API
 * addresses them by string code. Tuya's cloud endpoints do not expose `dp_id`
 * (/v1.0/devices/{id}/functions returns only code, type, values, name), so the index
 * has to be derived from Tuya's standard instruction set and then verified against
 * the device's real schema before anything is sent.
 */
const STANDARD_DPS: Record<string, number> = {
  // Lights, current revision
  switch_led: 20,
  work_mode: 21,
  bright_value_v2: 22,
  temp_value_v2: 23,
  colour_data_v2: 24,
  scene_data_v2: 25,
  // Lights, legacy revision
  bright_value: 2,
  temp_value: 3,
  colour_data: 5,
  // Curtains
  control: 1,
  percent_control: 2,
  // Single-gang switches and sockets
  switch: 1,
};

/** Returns the DPS index for a data point code, or undefined when it is unknown. */
export function dpsForCode(code: string): number | undefined {
  if (!code) return undefined;

  const numbered = /^switch_(\d+)$/.exec(code);
  if (numbered) {
    const index = Number(numbered[1]);
    return index > 0 ? index : undefined;
  }

  return STANDARD_DPS[code];
}

export type LocalSchema = Record<string, unknown>;

/**
 * Only trust a derived index when the device's own schema carries that index and its
 * current value still matches what the cloud last reported. A mismatch means the
 * mapping is wrong for this product, and acting on it would hit the wrong data point.
 */
export function canTrustDps(dps: number | undefined, cloudValue: unknown, schema: LocalSchema): boolean {
  if (dps === undefined || !schema) return false;
  if (!Object.prototype.hasOwnProperty.call(schema, String(dps))) return false;

  const localValue = schema[String(dps)];
  if (typeof localValue !== typeof cloudValue) return false;

  return localValue === cloudValue;
}

/** A device can only be reached on the LAN when both its key and address are known. */
export function canControlLocally(device: Device): boolean {
  return Boolean(device?.local_key) && Boolean(device?.ip);
}

export interface LocalTarget {
  id: string;
  key: string;
  ip: string;
  dps: number;
}

export function localTargetFor(device: Device, command: FunctionItem): LocalTarget | undefined {
  const dps = dpsForCode(command.code);
  if (dps === undefined || !canControlLocally(device)) return undefined;
  return { id: device.id, key: device.local_key, ip: device.ip, dps };
}

/** Protocol revisions to try, newest common first. The device list does not report it. */
const PROTOCOL_VERSIONS = ["3.3", "3.4", "3.5", "3.1"];

const CONNECT_TIMEOUT_MS = 4000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function readSchema(payload: unknown): LocalSchema {
  if (payload && typeof payload === "object" && "dps" in payload) {
    return (payload as { dps: LocalSchema }).dps ?? {};
  }
  return {};
}

/**
 * Sends a single data point over the LAN. The derived DPS index is checked against the
 * device's own schema first, so a product that does not follow Tuya's standard
 * numbering is refused rather than sent the wrong instruction.
 */
export async function sendLocalCommand(device: Device, command: FunctionItem): Promise<void> {
  const target = localTargetFor(device, command);
  if (!target) {
    throw new Error(`No local route for "${command.code}" on ${device.name}.`);
  }

  let lastError: Error = new Error("No protocol version accepted the connection.");

  for (const version of PROTOCOL_VERSIONS) {
    const handle = new TuyaDevice({ id: target.id, key: target.key, ip: target.ip, version });
    try {
      await withTimeout(handle.connect(), CONNECT_TIMEOUT_MS, `Connecting to ${device.name}`);

      const schema = readSchema(await withTimeout(handle.get({ schema: true }), CONNECT_TIMEOUT_MS, "Reading schema"));

      const expected = (device.status ?? []).find((status) => status.code === command.code)?.value;
      if (!canTrustDps(target.dps, expected, schema)) {
        throw new Error(
          `Data point ${target.dps} does not match "${command.code}" on this product, so it was not sent.`,
        );
      }

      await withTimeout(
        handle.set({ dps: target.dps, set: command.value as string | number | boolean }),
        CONNECT_TIMEOUT_MS,
        "Sending command",
      );
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    } finally {
      try {
        handle.disconnect();
      } catch {
        // the socket may already be closed
      }
    }
  }

  throw lastError;
}
