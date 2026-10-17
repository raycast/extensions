import type {
  AccessKind,
  AccessLink,
  WorkEdition,
  WorkKind,
  WorkResult,
} from "../types";

export type NormalizedSavedWork = {
  work: WorkResult;
  savedAt: string;
  collection: string;
  tags: string[];
};

export function normalizeSavedWork(
  value: unknown,
): NormalizedSavedWork | undefined {
  if (!isRecord(value)) return undefined;
  const work = normalizeWorkResult(value.work);
  if (!work) return undefined;
  return {
    work,
    savedAt:
      typeof value.savedAt === "string"
        ? value.savedAt
        : new Date().toISOString(),
    collection:
      typeof value.collection === "string" && value.collection.trim()
        ? value.collection.trim()
        : "Reading List",
    tags: stringArray(value.tags),
  };
}

function normalizeWorkResult(value: unknown): WorkResult | undefined {
  if (!isRecord(value)) return undefined;
  if (
    typeof value.id !== "string" ||
    !value.id.trim() ||
    typeof value.title !== "string" ||
    !value.title.trim()
  )
    return undefined;
  const identifiers = isRecord(value.identifiers) ? value.identifiers : {};
  const citation = isRecord(value.citation) ? value.citation : undefined;
  const editions = Array.isArray(value.editions)
    ? value.editions.map(normalizeEdition).filter(isDefined)
    : undefined;
  return {
    id: value.id.trim(),
    title: value.title.trim(),
    authors: stringArray(value.authors),
    year: finiteNumber(value.year),
    publisher: optionalString(value.publisher),
    kind: isWorkKind(value.kind) ? value.kind : "other",
    languages: optionalStringArray(value.languages),
    coverUrl: optionalString(value.coverUrl),
    abstract: optionalString(value.abstract),
    license: optionalString(value.license),
    version: optionalString(value.version),
    isRetracted:
      typeof value.isRetracted === "boolean" ? value.isRetracted : undefined,
    confidence: isConfidence(value.confidence) ? value.confidence : undefined,
    identifiers: {
      doi: optionalString(identifiers.doi),
      isbn: optionalStringArray(identifiers.isbn),
      issn: optionalStringArray(identifiers.issn),
      pmid: optionalString(identifiers.pmid),
      other: optionalStringArray(identifiers.other),
    },
    citation: citation
      ? {
          containerTitle: optionalString(citation.containerTitle),
          volume: optionalString(citation.volume),
          issue: optionalString(citation.issue),
          pages: optionalString(citation.pages),
          edition: optionalString(citation.edition),
          url: optionalString(citation.url),
        }
      : undefined,
    sources: stringArray(value.sources),
    providerId: optionalString(value.providerId),
    metadataEligible:
      typeof value.metadataEligible === "boolean"
        ? value.metadataEligible
        : undefined,
    metadataSources: optionalStringArray(value.metadataSources),
    accessSources: optionalStringArray(value.accessSources),
    accessLinks: Array.isArray(value.accessLinks)
      ? value.accessLinks.map(normalizeAccessLink).filter(isDefined)
      : [],
    editions,
  };
}

function normalizeAccessLink(value: unknown): AccessLink | undefined {
  if (!isRecord(value)) return undefined;
  if (
    typeof value.url !== "string" ||
    typeof value.source !== "string" ||
    !isAccessKind(value.kind)
  )
    return undefined;
  return {
    label:
      typeof value.label === "string" && value.label.trim()
        ? value.label
        : value.source,
    url: value.url,
    source: value.source,
    kind: value.kind,
    format: optionalString(value.format),
    language: optionalString(value.language),
    isOpenAccess:
      typeof value.isOpenAccess === "boolean" ? value.isOpenAccess : undefined,
  };
}

function normalizeEdition(value: unknown): WorkEdition | undefined {
  if (!isRecord(value) || typeof value.id !== "string") return undefined;
  const identifiers = isRecord(value.identifiers) ? value.identifiers : {};
  return {
    id: value.id,
    title: optionalString(value.title),
    year: finiteNumber(value.year),
    publisher: optionalString(value.publisher),
    languages: stringArray(value.languages),
    identifiers: {
      isbn: optionalStringArray(identifiers.isbn),
      other: optionalStringArray(identifiers.other),
    },
    sources: stringArray(value.sources),
    accessLinks: Array.isArray(value.accessLinks)
      ? value.accessLinks.map(normalizeAccessLink).filter(isDefined)
      : [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function optionalStringArray(value: unknown): string[] | undefined {
  const values = stringArray(value);
  return values.length ? values : undefined;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function isWorkKind(value: unknown): value is WorkKind {
  return [
    "book",
    "article",
    "thesis",
    "report",
    "encyclopedia",
    "other",
  ].includes(String(value));
}

function isAccessKind(value: unknown): value is AccessKind {
  return [
    "download",
    "read",
    "borrow",
    "record",
    "purchase",
    "institution",
  ].includes(String(value));
}

function isConfidence(
  value: unknown,
): value is NonNullable<WorkResult["confidence"]> {
  return ["exact", "high", "probable", "related"].includes(String(value));
}
