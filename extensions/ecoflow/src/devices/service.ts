import { normalizeQuotaResponse } from "../api/quotas";
import type { EcoFlowApiDevice, JsonObject, JsonValue } from "../api/types";
import type { DeviceCommandRequest, DeviceSnapshot } from "../types/device";
import { MAX_CONCURRENT_QUOTA_REQUESTS } from "../utils/constants";
import { findDeviceCommand, getDeviceCommands, validateCommandValue } from "./commands";
import { buildDeviceSnapshot } from "./status";

export interface EcoFlowTransport {
  listDevices(): Promise<EcoFlowApiDevice[]>;
  getAllQuotas(serialNumber: string): Promise<Record<string, JsonValue>>;
  setDeviceCommand(serialNumber: string, command: JsonObject): Promise<void>;
}

export interface ExecutedDeviceCommand {
  device: DeviceSnapshot;
  commandTitle: string;
}

export class EcoFlowService {
  constructor(private readonly transport: EcoFlowTransport) {}

  async listDeviceSnapshots(): Promise<DeviceSnapshot[]> {
    const devices = await this.transport.listDevices();
    return mapWithConcurrency(devices, MAX_CONCURRENT_QUOTA_REQUESTS, async (device) => {
      if (device.online !== 1) return buildDeviceSnapshot(device);

      try {
        const rawQuotas = await this.transport.getAllQuotas(device.sn);
        return buildDeviceSnapshot(device, normalizeQuotaResponse(rawQuotas));
      } catch (error) {
        return buildDeviceSnapshot(device, {}, readableError(error));
      }
    });
  }

  async getDeviceSnapshot(identifier: string): Promise<DeviceSnapshot> {
    const devices = await this.transport.listDevices();
    const device = resolveDevice(devices, identifier);

    if (device.online !== 1) return buildDeviceSnapshot(device);

    const quotas = normalizeQuotaResponse(await this.transport.getAllQuotas(device.sn));
    return buildDeviceSnapshot(device, quotas);
  }

  async executeCommand(request: DeviceCommandRequest): Promise<ExecutedDeviceCommand> {
    const device = await this.getDeviceSnapshot(request.serialNumber);
    if (!device.online) throw new Error(`${device.name} is offline.`);

    const command = findDeviceCommand(device, request.commandId);
    if (!command) {
      const available = getAvailableCommandIds(device);
      throw new Error(
        available.length
          ? `Unsupported control "${request.commandId}". Available controls: ${available.join(", ")}.`
          : `${device.profile.displayName} is currently read-only in this extension.`,
      );
    }

    validateCommandValue(command, request.value);
    await this.transport.setDeviceCommand(device.serialNumber, command.buildPayload(request.value, device.quotas));
    return { device, commandTitle: command.title };
  }
}

export function resolveDevice(devices: EcoFlowApiDevice[], identifier: string): EcoFlowApiDevice {
  const normalized = identifier.trim().toLowerCase();
  if (!normalized) {
    if (devices.length === 1 && devices[0]) return devices[0];
    throw new Error("Choose a device by name or serial number.");
  }

  const exact = devices.filter(
    (device) =>
      device.sn.toLowerCase() === normalized ||
      device.deviceName?.trim().toLowerCase() === normalized ||
      device.productName?.trim().toLowerCase() === normalized,
  );
  if (exact.length === 1 && exact[0]) return exact[0];

  const masked = devices.filter((device) => maskSerialNumber(device.sn).toLowerCase() === normalized);
  if (masked.length === 1 && masked[0]) return masked[0];
  if (masked.length > 1) {
    throw new Error(`"${identifier}" matches more than one device. Use its device name instead.`);
  }

  const partial = devices.filter((device) =>
    [device.deviceName, device.productName, device.sn].some((value) => value?.toLowerCase().includes(normalized)),
  );
  if (partial.length === 1 && partial[0]) return partial[0];
  if (partial.length > 1) {
    throw new Error(`"${identifier}" matches more than one device: ${partial.map(deviceLabel).join(", ")}.`);
  }

  throw new Error(
    devices.length
      ? `No device matches "${identifier}". Available devices: ${devices.map(deviceLabel).join(", ")}.`
      : "No EcoFlow devices are bound to this developer account.",
  );
}

export function getAvailableCommandIds(device: DeviceSnapshot): string[] {
  return getDeviceCommands(device).map((command) => command.id);
}

function deviceLabel(device: EcoFlowApiDevice): string {
  return device.deviceName?.trim() || device.productName?.trim() || maskSerialNumber(device.sn);
}

export function maskSerialNumber(serialNumber: string): string {
  if (serialNumber.length <= 8) return serialNumber;
  return `${serialNumber.slice(0, 4)}••••${serialNumber.slice(-4)}`;
}

function readableError(error: unknown): string {
  return error instanceof Error ? error.message : "Device readings could not be loaded.";
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const item = items[index];
      if (item !== undefined) results[index] = await mapper(item, index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}
