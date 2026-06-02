import { createReplacementId } from "./id";
import {
  hasValidationErrors,
  normalizeTags,
  validateReplacementInput,
} from "./validation";
import type { ReplacementInput, TextReplacement } from "./types";

export function createReplacement(
  existing: TextReplacement[],
  input: ReplacementInput,
): TextReplacement[] {
  const trigger = input.trigger.trim();
  const duplicate = existing.find((item) => item.trigger === trigger);
  if (duplicate && duplicate.replacementText === input.replacementText) {
    const tags = mergeTags(duplicate.tags, normalizeTags(input.tags));
    return existing.map((item) =>
      item.uuid === duplicate.uuid ? { ...item, tags } : item,
    );
  }

  ensureValid(input, existing);
  return [...existing, toReplacement(input)];
}

export function updateReplacement(
  existing: TextReplacement[],
  uuid: string,
  input: ReplacementInput,
): TextReplacement[] {
  ensureValid(input, existing, uuid);
  return existing.map((item) =>
    item.uuid === uuid
      ? {
          ...item,
          trigger: input.trigger.trim(),
          replacementText: input.replacementText,
          tags: normalizeTags(input.tags),
        }
      : item,
  );
}

export function cloneReplacement(
  existing: TextReplacement[],
  uuid: string,
  input: ReplacementInput,
): TextReplacement[] {
  const source = existing.find((item) => item.uuid === uuid);
  if (!source) {
    throw new Error("Replacement not found.");
  }

  ensureValid(input, existing);
  return [...existing, toReplacement(input)];
}

export function deleteReplacement(
  existing: TextReplacement[],
  uuid: string,
): TextReplacement[] {
  return existing.filter((item) => item.uuid !== uuid);
}

export function addTagsToReplacements(
  existing: TextReplacement[],
  uuids: string[],
  tags: string[] | string,
): TextReplacement[] {
  const selectedUuids = new Set(uuids);
  const incomingTags = normalizeTags(tags);

  return existing.map((item) =>
    selectedUuids.has(item.uuid)
      ? { ...item, tags: mergeTags(item.tags, incomingTags) }
      : item,
  );
}

function toReplacement(input: ReplacementInput): TextReplacement {
  return {
    uuid: createReplacementId(),
    trigger: input.trigger.trim(),
    replacementText: input.replacementText,
    tags: normalizeTags(input.tags),
    enabled: true,
  };
}

function mergeTags(existing: string[], incoming: string[]): string[] {
  return [...new Set([...existing, ...incoming])];
}

function ensureValid(
  input: ReplacementInput,
  existing: TextReplacement[],
  editingUuid?: string,
): void {
  const errors = validateReplacementInput(
    {
      trigger: input.trigger.trim(),
      replacementText: input.replacementText,
      tags: normalizeTags(input.tags),
    },
    existing,
    editingUuid,
  );

  if (hasValidationErrors(errors)) {
    throw new Error(Object.values(errors)[0] ?? "Replacement is invalid.");
  }
}
