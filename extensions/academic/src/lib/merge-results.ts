import { normalizeDoi } from "./query";
import type { AdvancedSearchQuery, WorkEdition, WorkResult } from "../types";

export function mergeAndRankResults(
  results: WorkResult[],
  query: string,
  advanced?: AdvancedSearchQuery,
): WorkResult[] {
  if (!results.length) return [];
  const parents = results.map((_, index) => index);
  const root = (index: number): number =>
    parents[index] === index ? index : (parents[index] = root(parents[index]));
  const join = (left: number, right: number) => {
    parents[root(right)] = root(left);
  };

  for (let left = 0; left < results.length; left += 1) {
    for (let right = left + 1; right < results.length; right += 1) {
      if (representsSameWork(results[left], results[right])) join(left, right);
    }
  }

  const clusters = new Map<number, WorkResult[]>();
  results.forEach((result, index) =>
    clusters.set(root(index), [...(clusters.get(root(index)) ?? []), result]),
  );

  return [...clusters.values()]
    .map(mergeCluster)
    .filter((work) => matchesAdvancedQuery(work, advanced))
    .map((work) => ({
      ...work,
      confidence: confidenceFor(work, query, advanced),
    }))
    .sort(
      (left, right) =>
        score(right, query, advanced) - score(left, query, advanced),
    );
}

function representsSameWork(left: WorkResult, right: WorkResult): boolean {
  if (sameIdentifier(left, right)) return true;
  if (!compatibleKinds(left.kind, right.kind)) return false;
  const leftTitle = normalizeTitle(left.title);
  const rightTitle = normalizeTitle(right.title);
  const similarity = titleSimilarity(leftTitle, rightTitle);
  if (similarity < 0.82) return false;
  const leftAuthors = authorKeys(left.authors);
  const rightAuthors = authorKeys(right.authors);
  if (
    leftAuthors.size &&
    rightAuthors.size &&
    ![...leftAuthors].some((author) => rightAuthors.has(author))
  )
    return false;
  if (
    left.kind !== "book" &&
    right.kind !== "book" &&
    left.year &&
    right.year &&
    Math.abs(left.year - right.year) > 2
  )
    return false;
  if (!leftAuthors.size && !rightAuthors.size) return similarity >= 0.95;
  return true;
}

function compatibleKinds(
  left: WorkResult["kind"],
  right: WorkResult["kind"],
): boolean {
  return left === right || left === "other" || right === "other";
}

function sameIdentifier(left: WorkResult, right: WorkResult): boolean {
  const leftDoi = normalizeDoi(left.identifiers.doi);
  const rightDoi = normalizeDoi(right.identifiers.doi);
  if (leftDoi && rightDoi && leftDoi === rightDoi) return true;
  const leftIsbn = new Set(
    (left.identifiers.isbn ?? []).map(normalizeIdentifier),
  );
  if (
    (right.identifiers.isbn ?? []).some((value) =>
      leftIsbn.has(normalizeIdentifier(value)),
    )
  )
    return true;
  if (
    left.identifiers.pmid &&
    right.identifiers.pmid &&
    left.identifiers.pmid === right.identifiers.pmid
  )
    return true;
  const other = new Set(left.identifiers.other ?? []);
  return (right.identifiers.other ?? []).some((value) => other.has(value));
}

function mergeCluster(cluster: WorkResult[]): WorkResult {
  const ordered = [...cluster].sort(
    (left, right) => completeness(right) - completeness(left),
  );
  return ordered.slice(1).reduce(merge, ordered[0]);
}

function merge(left: WorkResult, right: WorkResult): WorkResult {
  const linkMap = new Map(
    left.accessLinks.map((link) => [`${link.source}:${link.url}`, link]),
  );
  for (const link of right.accessLinks)
    linkMap.set(`${link.source}:${link.url}`, link);
  const mayEnrich =
    right.metadataEligible !== false || left.metadataEligible === false;
  return {
    ...left,
    id: canonicalId(left, right),
    title: mayEnrich ? betterTitle(left.title, right.title) : left.title,
    authors:
      mayEnrich && right.authors.length > left.authors.length
        ? right.authors
        : left.authors,
    year: mayEnrich
      ? earliestPlausibleYear(left.year, right.year, left.kind)
      : left.year,
    publisher: left.publisher ?? (mayEnrich ? right.publisher : undefined),
    languages: mayEnrich
      ? unique([...(left.languages ?? []), ...(right.languages ?? [])])
      : left.languages,
    coverUrl: left.coverUrl ?? (mayEnrich ? right.coverUrl : undefined),
    abstract: mayEnrich ? longer(left.abstract, right.abstract) : left.abstract,
    license: left.license ?? (mayEnrich ? right.license : undefined),
    version: left.version ?? (mayEnrich ? right.version : undefined),
    isRetracted: left.isRetracted || (mayEnrich && right.isRetracted),
    identifiers: {
      doi:
        left.identifiers.doi ?? (mayEnrich ? right.identifiers.doi : undefined),
      isbn: unique([
        ...(left.identifiers.isbn ?? []),
        ...(mayEnrich ? (right.identifiers.isbn ?? []) : []),
      ]),
      issn: unique([
        ...(left.identifiers.issn ?? []),
        ...(mayEnrich ? (right.identifiers.issn ?? []) : []),
      ]),
      pmid:
        left.identifiers.pmid ??
        (mayEnrich ? right.identifiers.pmid : undefined),
      other: unique([
        ...(left.identifiers.other ?? []),
        ...(mayEnrich ? (right.identifiers.other ?? []) : []),
      ]),
    },
    citation: {
      containerTitle:
        left.citation?.containerTitle ??
        (mayEnrich ? right.citation?.containerTitle : undefined),
      volume:
        left.citation?.volume ??
        (mayEnrich ? right.citation?.volume : undefined),
      issue:
        left.citation?.issue ?? (mayEnrich ? right.citation?.issue : undefined),
      pages:
        left.citation?.pages ?? (mayEnrich ? right.citation?.pages : undefined),
      edition:
        left.citation?.edition ??
        (mayEnrich ? right.citation?.edition : undefined),
      url: left.citation?.url ?? (mayEnrich ? right.citation?.url : undefined),
    },
    sources: unique([...left.sources, ...right.sources]),
    metadataSources: unique([
      ...(left.metadataSources ?? []),
      ...(right.metadataSources ?? []),
    ]),
    accessSources: unique([
      ...(left.accessSources ?? []),
      ...(right.accessSources ?? []),
    ]),
    accessLinks: [...linkMap.values()].sort(
      (a, b) => linkPriority(a.kind) - linkPriority(b.kind),
    ),
    editions: deduplicateEditions([
      ...editionCandidates(left),
      ...editionCandidates(right),
    ]),
  };
}

function editionCandidates(work: WorkResult): WorkEdition[] {
  if (work.editions?.length) return work.editions;
  if (work.kind !== "book") return [];
  return [
    {
      id: `${work.id}:edition`,
      title: work.title,
      year: work.year,
      publisher: work.publisher,
      languages: work.languages ?? [],
      identifiers: {
        isbn: work.identifiers.isbn,
        other: work.identifiers.other,
      },
      sources: work.sources,
      accessLinks: work.accessLinks,
    },
  ];
}

function deduplicateEditions(editions: WorkEdition[]): WorkEdition[] {
  const map = new Map<string, WorkEdition>();
  for (const edition of editions) {
    const key =
      edition.identifiers.isbn?.map(normalizeIdentifier).sort().join("|") ||
      `${normalizeTitle(edition.title ?? "")}:${edition.year ?? ""}:${normalize(edition.publisher ?? "")}:${edition.languages.join("|")}`;
    const existing = map.get(key);
    if (!existing) map.set(key, edition);
    else
      map.set(key, {
        ...existing,
        languages: unique([...existing.languages, ...edition.languages]),
        sources: unique([...existing.sources, ...edition.sources]),
        accessLinks: uniqueLinks([
          ...existing.accessLinks,
          ...edition.accessLinks,
        ]),
      });
  }
  return [...map.values()];
}

function matchesAdvancedQuery(
  work: WorkResult,
  advanced?: AdvancedSearchQuery,
): boolean {
  if (!advanced) return true;
  if (advanced.kind && advanced.kind !== "any" && work.kind !== advanced.kind)
    return false;
  if (
    advanced.doi &&
    normalizeDoi(work.identifiers.doi) !== normalizeDoi(advanced.doi)
  )
    return false;
  if (
    advanced.isbn &&
    !(work.identifiers.isbn ?? []).some(
      (value) =>
        normalizeIdentifier(value) === normalizeIdentifier(advanced.isbn!),
    )
  )
    return false;
  if (
    advanced.issn &&
    !(work.identifiers.issn ?? []).some(
      (value) =>
        normalizeIdentifier(value) === normalizeIdentifier(advanced.issn!),
    )
  )
    return false;
  if (advanced.title) {
    const candidateTitle = normalizeTitle(work.title);
    const requestedTitle = normalizeTitle(advanced.title);
    const similarity = titleSimilarity(candidateTitle, requestedTitle);
    const exactish =
      candidateTitle === requestedTitle ||
      candidateTitle.startsWith(`${requestedTitle} `);
    const requestedTokens = significantTokens(requestedTitle);
    const candidateTokens = new Set(significantTokens(candidateTitle));
    const containsRequestedTitle =
      requestedTokens.length > 0 &&
      requestedTokens.every((token) => candidateTokens.has(token));
    if (
      advanced.exactTitle
        ? !exactish
        : !containsRequestedTitle && similarity < 0.5
    )
      return false;
  }
  if (advanced.authors) {
    const requested = new Set(
      normalize(advanced.authors)
        .split(" ")
        .filter(
          (token) => token.length > 1 && !["and", "et", "al"].includes(token),
        ),
    );
    const present = new Set(
      normalize(work.authors.join(" ")).split(" ").filter(Boolean),
    );
    if (requested.size && ![...requested].every((token) => present.has(token)))
      return false;
  }
  if (
    advanced.publisher &&
    !normalize(work.publisher ?? "").includes(normalize(advanced.publisher))
  )
    return false;
  if (
    advanced.journal &&
    !normalize(work.citation?.containerTitle ?? work.publisher ?? "").includes(
      normalize(advanced.journal),
    )
  )
    return false;
  if (advanced.yearFrom && (!work.year || work.year < advanced.yearFrom))
    return false;
  if (advanced.yearTo && (!work.year || work.year > advanced.yearTo))
    return false;
  if (
    advanced.openAccessOnly &&
    !work.accessLinks.some((link) => link.isOpenAccess)
  )
    return false;
  return true;
}

function confidenceFor(
  work: WorkResult,
  query: string,
  advanced?: AdvancedSearchQuery,
): WorkResult["confidence"] {
  if (advanced?.doi || advanced?.isbn || advanced?.issn) return "exact";
  const value = relevance(work, query, advanced);
  if (value >= 0.9) return "exact";
  if (value >= 0.68) return "high";
  if (value >= 0.45) return "probable";
  return "related";
}

function relevance(
  work: WorkResult,
  query: string,
  advanced?: AdvancedSearchQuery,
): number {
  const requestedTitle = advanced?.title || query;
  const titleValue = titleSimilarity(
    normalizeTitle(work.title),
    normalizeTitle(requestedTitle),
  );
  if (advanced?.title) return titleValue;
  const tokens = new Set(
    normalize(query)
      .split(" ")
      .filter((token) => token.length > 1),
  );
  const haystack = new Set(
    normalize(
      `${work.title} ${work.authors.join(" ")} ${work.publisher ?? ""}`,
    ).split(" "),
  );
  const coverage = tokens.size
    ? [...tokens].filter((token) => haystack.has(token)).length / tokens.size
    : 0;
  return Math.max(titleValue, coverage);
}

function score(
  work: WorkResult,
  query: string,
  advanced?: AdvancedSearchQuery,
): number {
  let value = relevance(work, query, advanced) * 150;
  value += work.accessLinks.some((link) => link.kind === "download") ? 25 : 0;
  value += work.coverUrl ? 8 : 0;
  value += Math.min(work.sources.length * 3, 18);
  value += work.identifiers.doi || work.identifiers.isbn?.length ? 8 : 0;
  return value;
}

function titleSimilarity(left: string, right: string): number {
  if (!left || !right) return 0;
  if (left === right) return 1;
  const characterContainment =
    left.includes(right) || right.includes(left)
      ? Math.min(left.length, right.length) /
        Math.max(left.length, right.length)
      : 0;
  const leftTokens = new Set(
    left.split(" ").filter((token) => token.length > 1),
  );
  const rightTokens = new Set(
    right.split(" ").filter((token) => token.length > 1),
  );
  const intersection = [...leftTokens].filter((token) =>
    rightTokens.has(token),
  ).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return Math.max(
    characterContainment,
    intersection / Math.max(1, union),
    (intersection / Math.max(1, Math.min(leftTokens.size, rightTokens.size))) *
      0.92,
  );
}

function significantTokens(value: string): string[] {
  const stopwords = new Set([
    "a",
    "an",
    "and",
    "as",
    "at",
    "da",
    "das",
    "de",
    "do",
    "dos",
    "e",
    "em",
    "for",
    "in",
    "of",
    "on",
    "or",
    "the",
    "to",
  ]);
  return normalize(value)
    .split(" ")
    .filter((token) => token.length > 1 && !stopwords.has(token));
}

export function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeTitle(value: string): string {
  return normalize(value)
    .replace(
      /\b(?:second|third|fourth|revised|expanded|\d+(?:st|nd|rd|th)) edition\b/g,
      "",
    )
    .replace(/\b(?:segunda|terceira|quarta|edicao|revista|ampliada)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function authorKeys(authors: string[]): Set<string> {
  return new Set(
    authors.flatMap((author) => {
      const normalized = normalize(author);
      if (!normalized) return [];
      const familyName = author.includes(",")
        ? normalize(author.split(",")[0])
        : normalized.split(" ").at(-1);
      return familyName ? [familyName] : [];
    }),
  );
}

function completeness(work: WorkResult): number {
  return (
    (work.metadataEligible === false ? 0 : 1_000) +
    work.authors.length * 3 +
    (work.coverUrl ? 5 : 0) +
    (work.abstract ? 3 : 0) +
    (work.publisher ? 2 : 0) +
    (work.identifiers.doi ? 5 : 0) +
    (work.identifiers.isbn?.length ?? 0) * 2 +
    work.accessLinks.length
  );
}

function canonicalId(left: WorkResult, right: WorkResult): string {
  const doi = normalizeDoi(left.identifiers.doi ?? right.identifiers.doi);
  return doi ? `doi:${doi}` : left.id;
}
function betterTitle(left: string, right: string): string {
  if (/untitled/i.test(left)) return right;
  if (/untitled/i.test(right)) return left;
  return left.length >= right.length ? left : right;
}
function earliestPlausibleYear(
  left?: number,
  right?: number,
  kind?: WorkResult["kind"],
): number | undefined {
  if (!left) return right;
  if (!right) return left;
  return kind === "book" ? Math.min(left, right) : left;
}
function longer(left?: string, right?: string): string | undefined {
  return (left?.length ?? 0) >= (right?.length ?? 0) ? left : right;
}
function normalizeIdentifier(value: string): string {
  return value.replace(/[^0-9X]/gi, "").toUpperCase();
}
function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
function uniqueLinks(links: WorkResult["accessLinks"]) {
  return [
    ...new Map(
      links.map((link) => [`${link.source}:${link.url}`, link]),
    ).values(),
  ];
}
function linkPriority(kind: string): number {
  return (
    { download: 0, read: 1, borrow: 2, institution: 3, purchase: 4, record: 5 }[
      kind
    ] ?? 6
  );
}
