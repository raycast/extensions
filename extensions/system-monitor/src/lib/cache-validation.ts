import { HardwareInfo } from "./hardware-info";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidHardwareInfo(value: unknown): value is HardwareInfo {
  if (!isRecord(value)) {
    return false;
  }

  const requiredStrings = [
    "modelName",
    "modelIdentifier",
    "modelNumber",
    "modelYear",
    "chip",
    "totalCores",
    "memory",
    "serialNumber",
    "gpuChipset",
    "gpuCores",
    "gpuMemory",
  ] as const;

  for (const key of requiredStrings) {
    if (typeof value[key] !== "string") {
      return false;
    }
  }

  return typeof value.isUnifiedMemory === "boolean";
}

export function parseHardwareInfoCache(raw: string): HardwareInfo | undefined {
  try {
    const parsed: unknown = JSON.parse(raw);
    return isValidHardwareInfo(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}
