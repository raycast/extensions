import type { MicInfo } from "./dictation-types";

const DEFAULT_MIC: MicInfo = { name: "Default input device" };

export function parseDefaultMicInfo(systemProfilerJson: string): MicInfo {
  try {
    const parsed = JSON.parse(systemProfilerJson) as {
      SPAudioDataType?: unknown[];
    };
    const devices = flattenSystemProfilerItems(parsed.SPAudioDataType);
    const input = devices.find(isDefaultInputDevice);
    if (!input) return DEFAULT_MIC;
    return {
      name: stringValue(input._name) || DEFAULT_MIC.name,
      sampleRate: numberValue(input.coreaudio_device_srate),
      channels: numberValue(input.coreaudio_device_input),
    };
  } catch {
    return DEFAULT_MIC;
  }
}

export function flattenSystemProfilerItems(
  items: unknown,
): Record<string, unknown>[] {
  if (!Array.isArray(items)) return [];
  const out: Record<string, unknown>[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    out.push(record);
    out.push(...flattenSystemProfilerItems(record._items));
  }
  return out;
}

export function isDefaultInputDevice(item: Record<string, unknown>): boolean {
  const marker = item.coreaudio_default_audio_input_device;
  return marker === "spaudio_yes" || marker === "Yes" || marker === true;
}

export function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}
