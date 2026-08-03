import { Cache } from "@raycast/api";
import { execf } from "./exec";
import { getModelYear } from "./model-year";
import { parseHardwareInfoCache } from "./cache-validation";

const cache = new Cache();
const HARDWARE_CACHE_KEY = "hardware-info-v4";

export interface HardwareInfo {
  modelName: string;
  modelIdentifier: string;
  modelNumber: string;
  modelYear: string;
  chip: string;
  totalCores: string;
  memory: string;
  serialNumber: string;
  gpuChipset: string;
  gpuCores: string;
  gpuMemory: string;
  isUnifiedMemory: boolean;
}

function parseField(output: string, label: string): string | null {
  const match = output.match(new RegExp(`^[ \\t]*${label}:[ \\t]*(.+)$`, "m"));
  return match?.[1]?.trim() ?? null;
}

function parseHardwareProfile(output: string): Partial<HardwareInfo> {
  return {
    modelName: parseField(output, "Model Name") ?? "Unknown",
    modelIdentifier: parseField(output, "Model Identifier") ?? "Unknown",
    modelNumber: parseField(output, "Model Number") ?? "Unknown",
    chip: parseField(output, "Chip") ?? parseField(output, "Processor Name") ?? "Unknown",
    totalCores: parseField(output, "Total Number of Cores") ?? "Unknown",
    memory: parseField(output, "Memory") ?? "Unknown",
    serialNumber: parseField(output, "Serial Number \\(system\\)") ?? "Unknown",
  };
}

function parseDisplayProfile(output: string): {
  gpuChipset: string;
  gpuCores: string;
  vram: string | null;
  isUnifiedMemory: boolean;
} {
  const chipset = parseField(output, "Chipset Model") ?? "Unknown";
  const gpuCores = parseField(output, "Total Number of Cores") ?? "Unknown";
  const vram = parseField(output, "VRAM \\(Total\\)") ?? parseField(output, "VRAM");

  return {
    gpuChipset: chipset,
    gpuCores,
    vram,
    isUnifiedMemory: !vram,
  };
}

export async function getHardwareInfo(): Promise<HardwareInfo> {
  const cached = cache.get(HARDWARE_CACHE_KEY);
  if (cached) {
    const parsed = parseHardwareInfoCache(cached);
    if (parsed) {
      return parsed;
    }

    cache.set(HARDWARE_CACHE_KEY, "");
  }

  const [hardwareOutput, displayOutput, modelYear] = await Promise.all([
    execf("/usr/sbin/system_profiler", ["SPHardwareDataType"]),
    execf("/usr/sbin/system_profiler", ["SPDisplaysDataType"]),
    getModelYear(),
  ]);

  const hardware = parseHardwareProfile(hardwareOutput);
  const display = parseDisplayProfile(displayOutput);
  const memory = hardware.memory ?? "Unknown";
  const gpuMemory = display.isUnifiedMemory ? `Shared (${memory} system memory)` : (display.vram ?? "Unknown");

  const info: HardwareInfo = {
    modelName: hardware.modelName ?? "Unknown",
    modelIdentifier: hardware.modelIdentifier ?? "Unknown",
    modelNumber: hardware.modelNumber ?? "Unknown",
    modelYear,
    chip: hardware.chip ?? "Unknown",
    totalCores: hardware.totalCores ?? "Unknown",
    memory,
    serialNumber: hardware.serialNumber ?? "Unknown",
    gpuChipset: display.gpuChipset,
    gpuCores: display.gpuCores,
    gpuMemory,
    isUnifiedMemory: display.isUnifiedMemory,
  };

  cache.set(HARDWARE_CACHE_KEY, JSON.stringify(info));
  return info;
}
