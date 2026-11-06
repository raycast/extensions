import { randomUUID } from "node:crypto";
import { normalizeHost } from "./roku";
import type { RokuDevice } from "./types";

export interface DeviceStorage {
  allItems(): Promise<Record<string, unknown>>;
  getItem(key: string): Promise<unknown>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const PREFIX = "roku-direct.v2.";
const RECORD_PREFIX = `${PREFIX}device.`;
const ALIAS_PREFIX = `${PREFIX}alias.`;
const SELECTED_KEY = `${PREFIX}selected`;
interface DeviceRecord {
  version: 1;
  generation: string;
  device: RokuDevice;
}

function object(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function parse(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "string") return undefined;
  try {
    return object(JSON.parse(value));
  } catch {
    return undefined;
  }
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() && value.length <= 1024 ? value.trim() : undefined;
}

function validateDevice(value: unknown): RokuDevice | undefined {
  const device = object(value);
  const id = text(device?.id);
  const name = text(device?.name);
  const host = text(device?.host);
  const capabilities = object(device?.capabilities);
  if (!device || !id || !name || !host || !capabilities) return undefined;
  let normalizedHost: string;
  try {
    normalizedHost = normalizeHost(host);
  } catch {
    return undefined;
  }
  return {
    id,
    name,
    host: normalizedHost,
    model: text(device.model),
    softwareVersion: text(device.softwareVersion),
    isTv: typeof device.isTv === "boolean" ? device.isTv : undefined,
    powerMode: text(device.powerMode),
    controlMode: text(device.controlMode),
    macs: Array.isArray(device.macs)
      ? device.macs.filter(
          (mac): mac is string => typeof mac === "string" && /^(?:[\da-f]{2}[:-]){5}[\da-f]{2}$/i.test(mac),
        )
      : undefined,
    capabilities: {
      volume: typeof capabilities.volume === "boolean" ? capabilities.volume : undefined,
      power: typeof capabilities.power === "boolean" ? capabilities.power : undefined,
      findRemote: typeof capabilities.findRemote === "boolean" ? capabilities.findRemote : undefined,
    },
  };
}

function suffix(id: string): string {
  return Buffer.from(id, "utf8").toString("base64url");
}

function readRecord(value: unknown, id?: string): DeviceRecord | undefined {
  const record = parse(value);
  const generation = text(record?.generation);
  const device = validateDevice(record?.device);
  if (record?.version !== 1 || !generation || !device || (id !== undefined && device.id !== id)) return undefined;
  return { version: 1, generation, device };
}

function withAlias(record: DeviceRecord, rawAlias: unknown): RokuDevice {
  const alias = parse(rawAlias);
  const name = alias?.generation === record.generation ? text(alias.name) : undefined;
  return { ...record.device, name: name ?? record.device.name };
}

/** Independent keys prevent metadata refresh from overwriting names or default-TV choices. */
export function createDeviceStore(storage: DeviceStorage) {
  let pending: Promise<unknown> = Promise.resolve();
  function mutate<T>(action: () => Promise<T>): Promise<T> {
    const operation = pending.catch(() => undefined).then(action);
    pending = operation;
    return operation;
  }

  async function recordFor(id: string): Promise<DeviceRecord | undefined> {
    return readRecord(await storage.getItem(RECORD_PREFIX + suffix(id)), id);
  }

  async function getSavedDevices(): Promise<RokuDevice[]> {
    const items = await storage.allItems();
    const devices: RokuDevice[] = [];
    for (const [key, value] of Object.entries(items)) {
      if (!key.startsWith(RECORD_PREFIX)) continue;
      const record = readRecord(value);
      if (!record || key !== RECORD_PREFIX + suffix(record.device.id)) continue;
      devices.push(withAlias(record, items[ALIAS_PREFIX + suffix(record.device.id)]));
    }
    return devices.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  }

  async function saveDevices(devices: RokuDevice[]): Promise<void> {
    const valid = devices.map((device) => {
      const parsed = validateDevice(device);
      if (!parsed) throw new Error("This Roku has invalid device information. Discover it or add its address again.");
      return parsed;
    });
    return mutate(async () => {
      for (const device of valid) {
        const previous = await recordFor(device.id);
        const record: DeviceRecord = {
          version: 1,
          generation: previous?.generation ?? randomUUID(),
          device: {
            ...previous?.device,
            ...device,
            capabilities: { ...previous?.device.capabilities, ...device.capabilities },
          },
        };
        await storage.setItem(RECORD_PREFIX + suffix(device.id), JSON.stringify(record));
      }
      // Selection is explicit; discovery must never silently choose one of several TVs.
    });
  }

  async function updateDevice(device: RokuDevice): Promise<void> {
    return saveDevices([device]);
  }

  async function renameDevice(id: string, name: string): Promise<void> {
    const validName = text(name);
    if (!validName) throw new Error("Enter a name for this Roku.");
    return mutate(async () => {
      const record = await recordFor(id);
      if (!record) throw new Error("This Roku is no longer saved. Add it again first.");
      await storage.setItem(
        ALIAS_PREFIX + suffix(id),
        JSON.stringify({ generation: record.generation, name: validName }),
      );
    });
  }

  async function removeDevice(id: string): Promise<void> {
    return mutate(async () => {
      // Do not erase a concurrent selection/rename. Generations make old references inert after removal/re-add.
      await storage.removeItem(RECORD_PREFIX + suffix(id));
    });
  }

  async function getSelectedDevice(): Promise<RokuDevice | undefined> {
    const selected = parse(await storage.getItem(SELECTED_KEY));
    const id = text(selected?.id);
    if (!id) return undefined;
    const record = await recordFor(id);
    if (!record || selected?.generation !== record.generation) return undefined;
    return withAlias(record, await storage.getItem(ALIAS_PREFIX + suffix(id)));
  }

  async function selectDevice(id: string): Promise<void> {
    return mutate(async () => {
      const record = await recordFor(id);
      if (!record) throw new Error("This Roku is no longer saved.");
      await storage.setItem(SELECTED_KEY, JSON.stringify({ id, generation: record.generation }));
    });
  }

  return { getSavedDevices, saveDevices, updateDevice, removeDevice, getSelectedDevice, selectDevice, renameDevice };
}
