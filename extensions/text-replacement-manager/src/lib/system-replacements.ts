import { createReplacementId } from "./id";
import type {
  MetadataByTrigger,
  SystemReplacementItem,
  TextReplacement,
} from "./types";

export function mergeSystemWithMetadata(
  items: SystemReplacementItem[],
  metadata: MetadataByTrigger,
): TextReplacement[] {
  return items
    .filter((item) => item.replace && typeof item.replace === "string")
    .map((item) => {
      const stored = metadata[item.replace];

      return {
        uuid: stored?.uuid ?? createReplacementId(),
        trigger: item.replace,
        replacementText: typeof item.with === "string" ? item.with : "",
        tags: stored?.tags ?? [],
        enabled: isEnabledSystemValue(item.on),
      };
    });
}

export function serializeSystemItems(
  replacements: TextReplacement[],
): SystemReplacementItem[] {
  return replacements.map((item) => ({
    replace: item.trigger,
    with: item.replacementText,
    on: item.enabled ? 1 : 0,
  }));
}

export function metadataFromReplacements(
  replacements: TextReplacement[],
): MetadataByTrigger {
  return Object.fromEntries(
    replacements.map((item) => [
      item.trigger,
      {
        uuid: item.uuid,
        tags: item.tags,
      },
    ]),
  );
}

export function extractSystemItems(
  exportedDomain: unknown,
): SystemReplacementItem[] {
  if (!exportedDomain || typeof exportedDomain !== "object") {
    return [];
  }

  const domain = exportedDomain as {
    NSUserDictionaryReplacementItems?: unknown;
  };
  if (!Array.isArray(domain.NSUserDictionaryReplacementItems)) {
    return [];
  }

  return domain.NSUserDictionaryReplacementItems.filter(
    isSystemReplacementItem,
  );
}

function isSystemReplacementItem(
  value: unknown,
): value is SystemReplacementItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Partial<SystemReplacementItem>;
  return typeof item.replace === "string" && typeof item.with === "string";
}

function isEnabledSystemValue(value: SystemReplacementItem["on"]): boolean {
  if (value === undefined) {
    return true;
  }

  return value === true || value === 1 || value === "1";
}

export function toDefaultsWriteValue(items: SystemReplacementItem[]): string {
  const rows = items.map((item) => {
    const pairs = [
      `replace = ${toOpenStepString(item.replace)}`,
      `with = ${toOpenStepString(item.with)}`,
      `on = ${item.on ? 1 : 0}`,
    ];
    return `{ ${pairs.join("; ")}; }`;
  });

  return `(${rows.join(", ")})`;
}

function toOpenStepString(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}
