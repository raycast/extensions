import type { AIServiceId } from "./prompt-urls.js";

export const PRESETS_STORAGE_KEY = "prompt-presets";
export const PRESET_STORAGE_PREFIX = "prompt-preset:";
export const DELETED_PRESET_STORAGE_PREFIX = "deleted-prompt-preset:";

export type PresetServiceCounts = Record<AIServiceId, number>;

export interface PromptPreset {
  id: string;
  name: string;
  template: string;
  serviceCounts: PresetServiceCounts;
}

const ARGUMENT_PATTERN = /\{([\p{L}_][\p{L}\p{N}_-]*)\}/gu;
const PRESET_SERVICE_IDS = [
  "chatgpt",
  "claude",
  "grok",
  "perplexity",
] as const satisfies readonly AIServiceId[];

export const DEFAULT_SERVICE_COUNTS: PresetServiceCounts = Object.fromEntries(
  PRESET_SERVICE_IDS.map((serviceId) => [serviceId, 1]),
) as PresetServiceCounts;

export function extractTemplateArguments(template: string): string[] {
  const argumentsInOrder: string[] = [];
  const seen = new Set<string>();

  for (const match of template.matchAll(ARGUMENT_PATTERN)) {
    const argument = match[1];
    if (!seen.has(argument)) {
      seen.add(argument);
      argumentsInOrder.push(argument);
    }
  }

  return argumentsInOrder;
}

export function canRunPresetImmediately(
  preset: Pick<PromptPreset, "template">,
): boolean {
  return extractTemplateArguments(preset.template).length === 0;
}

export function renderPromptTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(ARGUMENT_PATTERN, (_, argument: string) => {
    const value = getTemplateArgumentValue(values, argument);
    if (value === undefined) {
      throw new Error(`Missing value for {${argument}}`);
    }
    return value;
  });
}

export function getTemplateArgumentValue(
  values: Record<string, string>,
  argument: string,
): string | undefined {
  if (!Object.prototype.hasOwnProperty.call(values, argument)) return undefined;
  const value: unknown = values[argument];
  return typeof value === "string" ? value : undefined;
}

export function deserializePresets(value: unknown): PromptPreset[] {
  if (typeof value !== "string") return [];

  try {
    const candidates: unknown = JSON.parse(value);
    if (!Array.isArray(candidates)) return [];

    const presets: PromptPreset[] = [];
    const seenIds = new Set<string>();
    for (const candidate of candidates) {
      const preset = parsePreset(candidate);
      if (preset && !seenIds.has(preset.id)) {
        presets.push(preset);
        seenIds.add(preset.id);
      }
    }
    return presets;
  } catch {
    return [];
  }
}

export function deserializeLegacyPresets(
  value: unknown,
): PromptPreset[] | undefined {
  if (typeof value !== "string") return undefined;

  try {
    const candidates: unknown = JSON.parse(value);
    if (!Array.isArray(candidates)) return undefined;

    const presets: PromptPreset[] = [];
    const seenIds = new Set<string>();
    for (const candidate of candidates) {
      const preset = parsePreset(candidate);
      if (
        !preset ||
        !hasValidStoredServiceCounts(candidate) ||
        seenIds.has(preset.id)
      ) {
        return undefined;
      }
      presets.push(preset);
      seenIds.add(preset.id);
    }
    return presets;
  } catch {
    return undefined;
  }
}

export function deserializePreset(value: unknown): PromptPreset | undefined {
  if (typeof value !== "string") return undefined;

  try {
    return parsePreset(JSON.parse(value));
  } catch {
    return undefined;
  }
}

export function presetStorageKey(id: string): string {
  return `${PRESET_STORAGE_PREFIX}${id}`;
}

export function deletedPresetStorageKey(id: string): string {
  return `${DELETED_PRESET_STORAGE_PREFIX}${id}`;
}

export function buildPresetDeeplink(
  ownerOrAuthorName: string,
  extensionName: string,
  presetId: string,
): string {
  const context = encodeURIComponent(JSON.stringify({ presetId }));
  return `raycast://extensions/${encodeURIComponent(ownerOrAuthorName)}/${encodeURIComponent(extensionName)}/run-presets?context=${context}`;
}

function parsePreset(value: unknown): PromptPreset | undefined {
  if (!isRecord(value)) return undefined;
  if (typeof value.id !== "string" || !value.id.trim()) return undefined;
  if (typeof value.name !== "string" || !value.name.trim()) return undefined;
  if (typeof value.template !== "string" || !value.template.trim()) {
    return undefined;
  }

  const storedCounts = isRecord(value.serviceCounts) ? value.serviceCounts : {};
  const serviceCounts = Object.fromEntries(
    PRESET_SERVICE_IDS.map((serviceId) => {
      const count = storedCounts[serviceId];
      return [
        serviceId,
        typeof count === "number" &&
        Number.isInteger(count) &&
        count >= 0 &&
        count <= 5
          ? count
          : 0,
      ];
    }),
  ) as PresetServiceCounts;

  return {
    id: value.id.trim(),
    name: value.name.trim(),
    template: value.template,
    serviceCounts,
  };
}

function hasValidStoredServiceCounts(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.serviceCounts)) return false;
  const serviceCounts = value.serviceCounts;

  return PRESET_SERVICE_IDS.every((serviceId) => {
    const count = serviceCounts[serviceId];
    return (
      typeof count === "number" &&
      Number.isInteger(count) &&
      count >= 0 &&
      count <= 5
    );
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
