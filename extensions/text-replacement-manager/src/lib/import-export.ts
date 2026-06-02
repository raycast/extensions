import { createReplacementId } from "./id";
import {
  hasValidationErrors,
  normalizeTags,
  validateReplacementInput,
} from "./validation";
import type { ImportResult, TextReplacement } from "./types";
import { ReplacementImportError } from "./types";
import { normalizeTagColors, type TagColorsByTag } from "./tag-colors";

interface RawImportItem {
  uuid?: unknown;
  trigger?: unknown;
  "replacement-text"?: unknown;
  tags?: unknown;
}

export function exportReplacementsToJson(
  replacements: TextReplacement[],
  tagColors?: TagColorsByTag,
): string {
  const exportPayload: Record<string, unknown> = {
    "Text Replacements": replacements.map((item) => ({
      uuid: item.uuid,
      trigger: item.trigger,
      "replacement-text": item.replacementText,
      tags: item.tags,
    })),
  };
  if (tagColors) {
    exportPayload["Tag Colors"] = tagColorsForReplacements(
      replacements,
      tagColors,
    );
  }

  return `${JSON.stringify(exportPayload, null, 2)}\n`;
}

function tagColorsForReplacements(
  replacements: TextReplacement[],
  tagColors: TagColorsByTag,
): TagColorsByTag {
  const exportedTags = new Set(replacements.flatMap((item) => item.tags));

  return Object.fromEntries(
    Object.entries(tagColors).filter(([tag]) => exportedTags.has(tag)),
  );
}

export function parseImportedReplacements(
  contents: string,
  existing: TextReplacement[],
): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    throw new ReplacementImportError("Import file must be valid JSON.");
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !Array.isArray((parsed as Record<string, unknown>)["Text Replacements"])
  ) {
    throw new ReplacementImportError(
      'Import file must contain a "Text Replacements" array.',
    );
  }

  const parsedImport = parsed as Record<string, unknown>;
  const rawItems = parsedImport["Text Replacements"] as RawImportItem[];
  const accepted: TextReplacement[] = [];
  const skipped: string[] = [];
  const seenTriggers = new Set<string>();

  for (const raw of rawItems) {
    const replacement = normalizeImportItem(raw);
    if (seenTriggers.has(replacement.trigger)) {
      throw new ReplacementImportError(
        `Trigger "${replacement.trigger}" appears more than once in the import file.`,
      );
    }
    seenTriggers.add(replacement.trigger);

    const existingItem = existing.find(
      (item) => item.trigger === replacement.trigger,
    );
    if (existingItem) {
      if (existingItem.replacementText === replacement.replacementText) {
        skipped.push(replacement.trigger);
        continue;
      }

      throw new ReplacementImportError(
        `Trigger "${replacement.trigger}" conflicts with an existing replacement.`,
      );
    }

    const errors = validateReplacementInput(replacement, [
      ...existing,
      ...accepted,
    ]);
    if (hasValidationErrors(errors)) {
      throw new ReplacementImportError(
        Object.values(errors)[0] ?? "Import item is invalid.",
      );
    }

    accepted.push({
      uuid: replacement.uuid,
      trigger: replacement.trigger,
      replacementText: replacement.replacementText,
      tags: replacement.tags,
      enabled: true,
    });
  }

  return {
    accepted,
    skipped,
    tagColors: normalizeTagColors(
      parsedImport["Tag Colors"],
      uniqueTags([...existing, ...accepted]),
    ),
  };
}

function uniqueTags(replacements: TextReplacement[]): string[] {
  return [...new Set(replacements.flatMap((item) => item.tags))];
}

function normalizeImportItem(raw: RawImportItem): TextReplacement {
  if (!raw || typeof raw !== "object") {
    throw new ReplacementImportError(
      "Each imported replacement must be an object.",
    );
  }

  return {
    uuid:
      typeof raw.uuid === "string" && raw.uuid.trim()
        ? raw.uuid
        : createReplacementId(),
    trigger: typeof raw.trigger === "string" ? raw.trigger.trim() : "",
    replacementText:
      typeof raw["replacement-text"] === "string"
        ? raw["replacement-text"]
        : "",
    tags: normalizeTags(
      Array.isArray(raw.tags)
        ? raw.tags.filter((tag): tag is string => typeof tag === "string")
        : [],
    ),
    enabled: true,
  };
}
