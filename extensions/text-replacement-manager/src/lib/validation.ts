import type { ReplacementInput, TextReplacement } from "./types";

export const triggerPattern = /^\S{1,64}$/;

export interface ReplacementValidationErrors {
  trigger?: string;
  replacementText?: string;
}

export function normalizeTags(tags: string[] | string | undefined): string[] {
  if (Array.isArray(tags)) {
    return tags.map((tag) => tag.trim()).filter(Boolean);
  }

  if (!tags) {
    return [];
  }

  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function suggestTags(
  input: string,
  existingTags: string[],
  limit = 5,
): string[] {
  const selected = new Set(
    normalizeTags(input).map((tag) => tag.toLocaleLowerCase()),
  );
  const query = input.split(",").at(-1)?.trim().toLocaleLowerCase() ?? "";
  if (!query) {
    return [];
  }

  return [...new Set(existingTags)]
    .filter((tag) => {
      const normalized = tag.toLocaleLowerCase();
      return !selected.has(normalized) && normalized.includes(query);
    })
    .sort((a, b) => a.localeCompare(b))
    .slice(0, limit);
}

export function applyTagSuggestion(input: string, suggestion: string): string {
  const parts = input.split(",");
  parts[parts.length - 1] = ` ${suggestion}`;
  return normalizeTags(parts.join(",")).join(", ");
}

export function validateReplacementInput(
  input: ReplacementInput,
  existing: TextReplacement[],
  editingUuid?: string,
): ReplacementValidationErrors {
  const errors: ReplacementValidationErrors = {};
  const trigger = input.trigger.trim();

  if (!triggerPattern.test(trigger)) {
    errors.trigger = "Trigger must be 1-64 non-whitespace characters.";
  } else if (
    existing.some(
      (item) => item.trigger === trigger && item.uuid !== editingUuid,
    )
  ) {
    errors.trigger = "Trigger must be unique.";
  }

  if (!input.replacementText.trim()) {
    errors.replacementText = "Replacement text is required.";
  }

  return errors;
}

export function hasValidationErrors(
  errors: ReplacementValidationErrors,
): boolean {
  return Boolean(errors.trigger || errors.replacementText);
}
