import type { TextReplacement } from "./types";

export function toggleReplacementSelection(
  selectedUuids: string[],
  uuid: string,
): string[] {
  return selectedUuids.includes(uuid)
    ? selectedUuids.filter((selectedUuid) => selectedUuid !== uuid)
    : [...selectedUuids, uuid];
}

export function selectAllReplacementIds(
  replacements: TextReplacement[],
): string[] {
  return replacements.map((replacement) => replacement.uuid);
}

export function clearReplacementSelection(): string[] {
  return [];
}
