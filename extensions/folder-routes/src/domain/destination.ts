import { isAbsolute, normalize, parse, sep } from "node:path";

export const DESTINATION_SCHEMA_VERSION = 1 as const;

export interface Destination {
  id: string;
  name: string;
  path: string;
  keywords: string[];
  copy: boolean;
  move: boolean;
  pinned: boolean;
}

export interface DestinationDraft {
  id?: string;
  name: string;
  path: string;
  keywords: string[];
  copy: boolean;
  move: boolean;
  pinned: boolean;
}

export interface DestinationCollectionV1 {
  version: typeof DESTINATION_SCHEMA_VERSION;
  destinations: Destination[];
}

export type DestinationCollection = DestinationCollectionV1;

export interface ValidationResult<T> {
  value?: T;
  errors: string[];
}

export function normalizeKeywords(keywords: readonly string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const keyword of keywords) {
    const value = keyword.trim();
    const key = value.toLocaleLowerCase();
    if (value && !seen.has(key)) {
      seen.add(key);
      normalized.push(value);
    }
  }

  return normalized;
}

export function validateDestinationDraft(draft: DestinationDraft): ValidationResult<DestinationDraft> {
  const errors: string[] = [];
  const name = draft.name.trim();
  const rawPath = draft.path.trim();
  const id = draft.id?.trim();

  if (!name) {
    errors.push("Name is required.");
  }
  if (!rawPath) {
    errors.push("Path is required.");
  } else if (!isAbsolute(rawPath)) {
    errors.push("Path must be absolute.");
  }
  if (draft.id !== undefined && !id) {
    errors.push("ID must not be empty when provided.");
  }

  if (errors.length > 0) {
    return { errors };
  }

  return {
    errors: [],
    value: {
      id,
      name,
      path: normalizeDirectoryPath(rawPath),
      keywords: normalizeKeywords(draft.keywords),
      copy: draft.copy,
      move: draft.move,
      pinned: draft.pinned,
    },
  };
}

export function sortDestinations(destinations: readonly Destination[]): Destination[] {
  return [...destinations].sort(
    (left, right) =>
      Number(right.pinned) - Number(left.pinned) ||
      left.name.localeCompare(right.name, undefined, { sensitivity: "base" }) ||
      left.path.localeCompare(right.path),
  );
}

export type DuplicateField = "id" | "name" | "path";

export function findDuplicateFields(
  candidate: Pick<Destination, "id" | "name" | "path">,
  destinations: readonly Destination[],
  ignoreId?: string,
): DuplicateField[] {
  const fields = new Set<DuplicateField>();
  const candidateName = candidate.name.toLocaleLowerCase();
  const candidatePath = normalizeDirectoryPath(candidate.path).toLocaleLowerCase();

  for (const destination of destinations) {
    if (destination.id === ignoreId) {
      continue;
    }
    if (destination.id === candidate.id) {
      fields.add("id");
    }
    if (destination.name.toLocaleLowerCase() === candidateName) {
      fields.add("name");
    }
    if (normalizeDirectoryPath(destination.path).toLocaleLowerCase() === candidatePath) {
      fields.add("path");
    }
  }

  return [...fields];
}

export function normalizeDirectoryPath(path: string): string {
  const normalized = normalize(path);
  const root = parse(normalized).root;
  return normalized === root ? normalized : normalized.replace(new RegExp(`${escapeRegExp(sep)}+$`), "");
}

export function isDestination(value: unknown): value is Destination {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.path === "string" &&
    Array.isArray(value.keywords) &&
    value.keywords.every((keyword) => typeof keyword === "string") &&
    typeof value.copy === "boolean" &&
    typeof value.move === "boolean" &&
    typeof value.pinned === "boolean"
  );
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
