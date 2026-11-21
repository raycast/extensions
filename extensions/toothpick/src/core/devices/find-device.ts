import { ratio } from "fuzzball";
import { Device } from "./devices.model";

export function findDevice(devices: Device[], nameOrMacAddress: string, fuzzyRatio: string): Device | undefined {
  const minimumRatio = Number(fuzzyRatio);
  if (!fuzzyRatio.trim() || !Number.isFinite(minimumRatio) || minimumRatio < 0 || minimumRatio > 100) {
    throw new Error("Invalid fuzzy ratio. Check extension preferences.");
  }

  return devices.find(
    (device) =>
      device.macAddress.toUpperCase() === nameOrMacAddress.toUpperCase() ||
      ratio(device.name, nameOrMacAddress) >= minimumRatio,
  );
}
