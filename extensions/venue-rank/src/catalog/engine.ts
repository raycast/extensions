import Fuse from "fuse.js";
import type {
  Assessment,
  AssessmentResult,
  SearchOptions,
  SearchResult,
  Venue,
  VenueCatalog,
  VenueDataset,
} from "./types";

export type * from "./types";

export function normalizeVenueQuery(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function assertUnique(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length)
    throw new Error(`Duplicate ${label}`);
}

export function validateDataset(dataset: VenueDataset): void {
  if (dataset.schemaVersion !== 1 || !dataset.version.trim())
    throw new Error("Unsupported or unversioned dataset");
  assertUnique(
    dataset.venues.map((v) => v.id),
    "venue ID",
  );
  assertUnique(
    dataset.sources.map((s) => s.id),
    "source ID",
  );
  const venues = new Map(dataset.venues.map((v) => [v.id, v]));
  const sources = new Map(dataset.sources.map((s) => [s.id, s]));
  for (const venue of dataset.venues) {
    if (
      !venue.id.trim() ||
      !venue.name.trim() ||
      !["conference", "journal"].includes(venue.type)
    )
      throw new Error(`Invalid venue: ${venue.id}`);
    if (venue.dblp && !isHttpUrl(venue.dblp))
      throw new Error(`Invalid venue URL: ${venue.id}`);
  }
  for (const source of dataset.sources) {
    if (
      !source.id ||
      !source.name ||
      !source.edition ||
      !source.retrievedAt ||
      !isHttpUrl(source.publisherUrl) ||
      !isHttpUrl(source.dataUrl)
    )
      throw new Error(`Invalid source: ${source.id}`);
    if (
      !["complete", "partial"].includes(source.coverage) ||
      !["grade", "inclusion"].includes(source.kind) ||
      source.appliesTo.length === 0 ||
      source.appliesTo.some((type) => !["conference", "journal"].includes(type))
    )
      throw new Error(`Invalid source semantics: ${source.id}`);
  }
  const seen = new Set<string>();
  for (const assessment of dataset.assessments) {
    const venue = venues.get(assessment.venueId);
    const source = sources.get(assessment.sourceId);
    if (!venue || !source)
      throw new Error(
        `Unknown assessment reference: ${assessment.venueId}/${assessment.sourceId}`,
      );
    if (
      !source.appliesTo.includes(venue.type) ||
      !source.labels.includes(assessment.value) ||
      !isHttpUrl(assessment.url)
    )
      throw new Error(
        `Invalid assessment: ${assessment.venueId}/${assessment.sourceId}`,
      );
    const key = JSON.stringify([
      assessment.venueId,
      assessment.sourceId,
      assessment.area ?? "",
    ]);
    if (seen.has(key)) throw new Error(`Duplicate assessment: ${key}`);
    seen.add(key);
  }
}

function isHttpUrl(value: string): boolean {
  try {
    return ["https:", "http:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export function createCatalog(input: VenueDataset): VenueCatalog {
  // The catalog owns a copy so caller mutations cannot invalidate its search index.
  const dataset = structuredClone(input);
  validateDataset(dataset);
  const byId = new Map(dataset.venues.map((venue) => [venue.id, venue]));
  const byVenue = new Map<string, Assessment[]>();
  for (const assessment of dataset.assessments) {
    const entries = byVenue.get(assessment.venueId) ?? [];
    entries.push(assessment);
    byVenue.set(assessment.venueId, entries);
  }
  const documents = dataset.venues.map((venue) => ({
    venue,
    acronym: normalizeVenueQuery(venue.acronym),
    name: normalizeVenueQuery(venue.name),
    aliases: venue.aliases.map(normalizeVenueQuery),
  }));
  const fuse = new Fuse(documents, {
    keys: [
      { name: "acronym", weight: 0.45 },
      { name: "aliases", weight: 0.3 },
      { name: "name", weight: 0.25 },
    ],
    threshold: 0.32,
    ignoreLocation: true,
    includeScore: true,
  });
  function getAssessments(id: string): AssessmentResult[] {
    const venue = byId.get(id);
    if (!venue) return [];
    return dataset.sources.map((source) => {
      const assessments = (byVenue.get(id) ?? []).filter(
        (entry) => entry.sourceId === source.id,
      );
      const status = !source.appliesTo.includes(venue.type)
        ? "not-applicable"
        : assessments.length
          ? "assessed"
          : source.coverage === "complete"
            ? "not-listed"
            : "unknown";
      return { source, status, assessments };
    });
  }
  function search(query: string, options: SearchOptions = {}): SearchResult[] {
    if (options.value && !options.sourceId)
      throw new Error("A grade filter requires a source ID");
    const limit = options.limit ?? 30;
    if (!Number.isInteger(limit) || limit < 0)
      throw new Error("Search limit must be a non-negative integer");
    const normalized = normalizeVenueQuery(query);
    const allowed = (venue: Venue) =>
      (!options.type || venue.type === options.type) &&
      (!options.sourceId ||
        (byVenue.get(venue.id) ?? []).some(
          (a) =>
            a.sourceId === options.sourceId &&
            (!options.value || a.value === options.value),
        ));
    const results = new Map<string, SearchResult>();
    for (const doc of documents) {
      if (!allowed(doc.venue)) continue;
      const terms = [doc.acronym, doc.name, ...doc.aliases].filter(Boolean);
      if (!normalized)
        results.set(doc.venue.id, {
          venue: doc.venue,
          match: "browse",
          score: 1,
        });
      else if (terms.includes(normalized))
        results.set(doc.venue.id, {
          venue: doc.venue,
          match: "exact",
          score: 0,
        });
      else if (terms.some((term) => term.startsWith(normalized)))
        results.set(doc.venue.id, {
          venue: doc.venue,
          match: "prefix",
          score: 0.1,
        });
    }
    if (normalized) {
      for (const { item, score } of fuse.search(normalized)) {
        if (allowed(item.venue) && !results.has(item.venue.id))
          results.set(item.venue.id, {
            venue: item.venue,
            match: "fuzzy",
            score: 0.2 + (score ?? 1),
          });
      }
    }
    return [...results.values()]
      .sort(
        (a, b) =>
          a.score - b.score ||
          (a.venue.acronym || a.venue.name).localeCompare(
            b.venue.acronym || b.venue.name,
          ) ||
          a.venue.id.localeCompare(b.venue.id),
      )
      .slice(0, limit);
  }
  return { dataset, search, getVenue: (id) => byId.get(id), getAssessments };
}
