import { randomUUID } from "node:crypto";

import {
  type Destination,
  type DestinationDraft,
  findDuplicateFields,
  isRecord,
  validateDestinationDraft,
} from "./destination";
import { CsvParseError, parseCsv } from "./csv";

export type ImportFormat = "csv" | "json";
export type ImportStatus = "valid" | "invalid" | "duplicate" | "missing-folder";
export type ImportConflictStrategy = "skip" | "replace";

export interface ParsedImportEntry {
  sourceIndex: number;
  sourceLabel: string;
  draft?: DestinationDraft;
  errors: string[];
}

export interface ParsedImport {
  format: ImportFormat;
  entries: ParsedImportEntry[];
  fatalErrors: string[];
}

export interface ImportPreviewItem {
  sourceIndex: number;
  sourceLabel: string;
  status: ImportStatus;
  messages: string[];
  destination?: Destination;
}

export interface ImportPreview {
  format: ImportFormat;
  items: ImportPreviewItem[];
  fatalErrors: string[];
}

export interface ImportCounts {
  valid: number;
  invalid: number;
  duplicate: number;
  missingFolder: number;
}

export interface MergeImportResult {
  destinations: Destination[];
  importedCount: number;
  replacedCount: number;
  skippedCount: number;
}

const CSV_HEADERS = ["id", "name", "path", "keywords", "copy", "move", "pinned"] as const;

export function detectImportFormat(fileName: string, content: string): ImportFormat {
  const lowerName = fileName.toLocaleLowerCase();
  if (lowerName.endsWith(".json")) {
    return "json";
  }
  if (lowerName.endsWith(".csv")) {
    return "csv";
  }
  return content.trimStart().startsWith("[") ? "json" : "csv";
}

export function parseImport(content: string, format: ImportFormat): ParsedImport {
  return format === "csv" ? parseCsvImport(content) : parseJsonImport(content);
}

export function parseCsvImport(content: string): ParsedImport {
  try {
    const rows = parseCsv(content);
    if (rows.length === 0) {
      return { format: "csv", entries: [], fatalErrors: ["The CSV file is empty."] };
    }

    const headers = rows[0].values.map((header) => header.trim().toLocaleLowerCase());
    const duplicateHeaders = headers.filter((header, index) => headers.indexOf(header) !== index);
    const missingHeaders = ["name", "path"].filter((required) => !headers.includes(required));
    const unknownHeaders = headers.filter((header) => !CSV_HEADERS.includes(header as (typeof CSV_HEADERS)[number]));
    const fatalErrors: string[] = [];

    if (duplicateHeaders.length > 0) {
      fatalErrors.push(`Duplicate CSV headers: ${[...new Set(duplicateHeaders)].join(", ")}.`);
    }
    if (missingHeaders.length > 0) {
      fatalErrors.push(`Missing required CSV headers: ${missingHeaders.join(", ")}.`);
    }
    if (unknownHeaders.length > 0) {
      fatalErrors.push(`Unknown CSV headers: ${unknownHeaders.join(", ")}.`);
    }
    if (fatalErrors.length > 0) {
      return { format: "csv", entries: [], fatalErrors };
    }

    const entries = rows.slice(1).map((row, index) => {
      const sourceIndex = index + 1;
      const values = Object.fromEntries(headers.map((header, column) => [header, row.values[column]?.trim() ?? ""]));
      const errors: string[] = [];
      if (row.values.length !== headers.length) {
        errors.push(`Expected ${headers.length} fields but found ${row.values.length}.`);
      }

      const copy = parseBoolean(values.copy, true, "copy", errors);
      const move = parseBoolean(values.move, true, "move", errors);
      const pinned = parseBoolean(values.pinned, false, "pinned", errors);

      return {
        sourceIndex,
        sourceLabel: `CSV line ${row.line}`,
        draft:
          errors.length === 0
            ? {
                id: values.id || undefined,
                name: values.name,
                path: values.path,
                keywords: values.keywords ? values.keywords.split(";") : [],
                copy,
                move,
                pinned,
              }
            : undefined,
        errors,
      };
    });

    return { format: "csv", entries, fatalErrors: [] };
  } catch (error) {
    return {
      format: "csv",
      entries: [],
      fatalErrors: [error instanceof CsvParseError ? error.message : String(error)],
    };
  }
}

export function parseJsonImport(content: string): ParsedImport {
  let value: unknown;
  try {
    value = JSON.parse(content) as unknown;
  } catch (error) {
    return {
      format: "json",
      entries: [],
      fatalErrors: [`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`],
    };
  }

  if (!Array.isArray(value)) {
    return { format: "json", entries: [], fatalErrors: ["The JSON root must be an array."] };
  }

  const entries = value.map((item, index): ParsedImportEntry => {
    const sourceIndex = index + 1;
    const sourceLabel = `JSON item ${sourceIndex}`;
    if (!isRecord(item)) {
      return { sourceIndex, sourceLabel, errors: ["Entry must be an object."] };
    }

    const errors: string[] = [];
    const name = readString(item.name, "name", errors, true);
    const path = readString(item.path, "path", errors, true);
    const id = readString(item.id, "id", errors, false);
    const keywords = readKeywords(item.keywords, errors);
    const copy = readBoolean(item.copy, "copy", errors, true);
    const move = readBoolean(item.move, "move", errors, true);
    const pinned = readBoolean(item.pinned, "pinned", errors, false);

    return {
      sourceIndex,
      sourceLabel,
      draft:
        errors.length === 0
          ? {
              id: id || undefined,
              name,
              path,
              keywords,
              copy,
              move,
              pinned,
            }
          : undefined,
      errors,
    };
  });

  return { format: "json", entries, fatalErrors: [] };
}

export async function buildImportPreview(
  parsed: ParsedImport,
  existing: readonly Destination[],
  isDirectory: (path: string) => Promise<boolean>,
  createId: () => string = randomUUID,
): Promise<ImportPreview> {
  const items: ImportPreviewItem[] = [];
  const earlierCandidates: Destination[] = [];

  for (const entry of parsed.entries) {
    if (!entry.draft || entry.errors.length > 0) {
      items.push({ ...entry, status: "invalid", messages: entry.errors });
      continue;
    }

    const validation = validateDestinationDraft(entry.draft);
    if (!validation.value) {
      items.push({ ...entry, status: "invalid", messages: validation.errors });
      continue;
    }

    const destination: Destination = {
      ...validation.value,
      id: validation.value.id ?? createId(),
    };
    if (!(await isDirectory(destination.path))) {
      items.push({
        ...entry,
        status: "missing-folder",
        messages: ["Folder does not exist or is not a directory."],
        destination,
      });
      continue;
    }

    const duplicateFields = findDuplicateFields(destination, [...existing, ...earlierCandidates]);
    earlierCandidates.push(destination);
    items.push({
      ...entry,
      status: duplicateFields.length > 0 ? "duplicate" : "valid",
      messages: duplicateFields.length > 0 ? [`Duplicates existing or earlier ${duplicateFields.join(", ")}.`] : [],
      destination,
    });
  }

  return { format: parsed.format, items, fatalErrors: parsed.fatalErrors };
}

export function countImportStatuses(preview: ImportPreview): ImportCounts {
  return preview.items.reduce<ImportCounts>(
    (counts, item) => {
      if (item.status === "missing-folder") {
        counts.missingFolder += 1;
      } else {
        counts[item.status] += 1;
      }
      return counts;
    },
    { valid: 0, invalid: 0, duplicate: 0, missingFolder: 0 },
  );
}

export function mergeImportedDestinations(
  existing: readonly Destination[],
  preview: ImportPreview,
  strategy: ImportConflictStrategy,
): MergeImportResult {
  let destinations = [...existing];
  let importedCount = 0;
  let replacedCount = 0;
  let skippedCount = 0;

  for (const item of preview.items) {
    if (!item.destination || item.status === "invalid" || item.status === "missing-folder") {
      skippedCount += 1;
      continue;
    }
    if (item.status === "duplicate" && strategy === "skip") {
      skippedCount += 1;
      continue;
    }

    const destination = item.destination;
    if (strategy === "replace") {
      const matchingIndexes = destinations.flatMap((current, index) =>
        findDuplicateFields(destination, [current]).length > 0 ? [index] : [],
      );
      if (matchingIndexes.length > 0) {
        const matchingIds = new Set(matchingIndexes.map((index) => destinations[index].id));
        destinations = destinations.filter((current) => !matchingIds.has(current.id));
        replacedCount += matchingIds.size;
      }
    }

    destinations.push(destination);
    importedCount += 1;
  }

  return { destinations, importedCount, replacedCount, skippedCount };
}

function parseBoolean(value: string | undefined, defaultValue: boolean, field: string, errors: string[]): boolean {
  if (value === undefined || value === "") {
    return defaultValue;
  }
  if (value.toLocaleLowerCase() === "true") {
    return true;
  }
  if (value.toLocaleLowerCase() === "false") {
    return false;
  }
  errors.push(`${field} must be true or false.`);
  return defaultValue;
}

function readString(value: unknown, field: string, errors: string[], required: boolean): string {
  if (value === undefined && !required) {
    return "";
  }
  if (typeof value !== "string") {
    errors.push(`${field} must be a string.`);
    return "";
  }
  return value.trim();
}

function readBoolean(value: unknown, field: string, errors: string[], defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }
  if (typeof value !== "boolean") {
    errors.push(`${field} must be a boolean.`);
    return defaultValue;
  }
  return value;
}

function readKeywords(value: unknown, errors: string[]): string[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value) || !value.every((keyword) => typeof keyword === "string")) {
    errors.push("keywords must be an array of strings.");
    return [];
  }
  return value;
}
