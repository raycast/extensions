import type { SearchRequest, WorkResult } from "../types";
import { mergeAndRankResults } from "./merge-results";

export function mergeAccessIntoSelected(
  work: WorkResult,
  candidates: WorkResult[],
): WorkResult {
  const marker = "__academic_selected_work__";
  const seed: WorkResult = {
    ...work,
    sources: [...work.sources, marker],
    accessSources: [],
    accessLinks: [],
    metadataEligible: true,
  };
  const merged = mergeAndRankResults(
    [seed, ...candidates],
    targetedQuery(work),
  );
  const selected =
    merged.find((candidate) => candidate.sources.includes(marker)) ?? seed;
  return {
    ...selected,
    sources: selected.sources.filter((source) => source !== marker),
  };
}

export function targetedQuery(work: WorkResult): string {
  return targetedQueries(work)[0] ?? work.title;
}

export function targetedRequest(work: WorkResult): SearchRequest {
  const descriptive = [work.title, work.authors.join(" ")]
    .filter(Boolean)
    .join(" ")
    .trim();
  const queries = targetedQueries(work);
  const primary = queries[0] ?? descriptive;
  return {
    text: primary,
    matchText: descriptive || primary,
    fallbackTexts: queries.slice(1),
  };
}

export function targetedQueries(work: WorkResult): string[] {
  const descriptive = [work.title, work.authors.join(" ")]
    .filter(Boolean)
    .join(" ")
    .trim();
  const candidates = [
    work.identifiers.doi,
    descriptive,
    ...(work.identifiers.isbn ?? []),
    ...(work.identifiers.issn ?? []),
    work.identifiers.pmid,
    work.title,
  ];
  const seen = new Set<string>();
  return candidates.flatMap((value) => {
    const trimmed = value?.trim();
    if (!trimmed) return [];
    const key = trimmed.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) return [];
    seen.add(key);
    return [trimmed];
  });
}
