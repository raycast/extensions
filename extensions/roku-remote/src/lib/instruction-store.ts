import { LocalStorage } from "@raycast/api";
import {
  EMPTY_INSTRUCTION_SETTINGS,
  normalizeInstructionName,
  type InstructionSettings,
  type TargetAlias,
} from "./instructions";

const KEY = "roku-direct.instructions.v1";
function object(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
function string(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 1024;
}
function sanitize(value: unknown): InstructionSettings {
  const settings = object(value);
  const roomAliases: Record<string, string> = Object.create(null);
  for (const [alias, id] of Object.entries(object(settings?.roomAliases) ?? {})) {
    if (string(alias) && string(id)) roomAliases[normalizeInstructionName(alias)] = id;
  }
  const targetAliases: TargetAlias[] = [];
  for (const entry of Array.isArray(settings?.targetAliases) ? settings.targetAliases : []) {
    const alias = object(entry);
    if (alias && string(alias.alias) && string(alias.deviceId) && string(alias.appId))
      targetAliases.push({
        alias: normalizeInstructionName(alias.alias),
        deviceId: alias.deviceId,
        appId: alias.appId,
      });
  }
  return {
    roomAliases,
    targetAliases,
    protectedDeviceIds: [
      ...new Set((Array.isArray(settings?.protectedDeviceIds) ? settings.protectedDeviceIds : []).filter(string)),
    ],
  };
}
export async function getInstructionSettings(): Promise<InstructionSettings> {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (!raw) return sanitize(EMPTY_INSTRUCTION_SETTINGS);
  try {
    return sanitize(JSON.parse(raw));
  } catch {
    return sanitize(EMPTY_INSTRUCTION_SETTINGS);
  }
}
export async function saveInstructionSettings(settings: InstructionSettings): Promise<void> {
  await LocalStorage.setItem(KEY, JSON.stringify(sanitize(settings)));
}
