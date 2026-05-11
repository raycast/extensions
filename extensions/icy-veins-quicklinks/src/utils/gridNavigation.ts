import { wowClasses } from "../data/classes";
import { getPagesForMode } from "../data/pages";
import { specs } from "../data/specs";
import { normalizeQuery, titleCase } from "./text";
import { getBestStartMatch, matchClass, matchGlobalSpec } from "./specMatcher";
import type {
  ClassEntry,
  GridState,
  Mode,
  PageEntry,
  SpecEntry,
  SpecGridItem,
} from "../types";
import { getSuggestions } from "./suggestions";

export type { GridState, SpecGridItem };

export function getAvailableModes(spec: SpecEntry): Mode[] {
  return spec.pveRole === "tank" ? ["pve"] : ["pve", "pvp"];
}

export function getClassSpecs(classEntry: ClassEntry): SpecEntry[] {
  return specs.filter((spec) => {
    const specClass = wowClasses.find((c) => spec.slug.endsWith(`-${c.slug}`));
    return specClass?.slug === classEntry.slug;
  });
}

function getClassScopedSpecKeywords(
  spec: SpecEntry,
  classEntry: ClassEntry,
): string[] {
  const specName = spec.slug
    .slice(0, -`-${classEntry.slug}`.length)
    .replace(/-/g, " ");

  return Array.from(new Set([specName, ...spec.aliases]));
}

function getExactClassScopedSpecMatch(
  classEntry: ClassEntry,
  normalizedQuery: string,
) {
  return getBestStartMatch(
    normalizedQuery,
    getClassSpecs(classEntry).map((spec) => ({
      aliases: getClassScopedSpecKeywords(spec, classEntry),
      item: spec,
    })),
  );
}

function getSpecGridItems(classEntry: ClassEntry, prefix = ""): SpecGridItem[] {
  const normalizedPrefix = normalizeQuery(prefix);

  return getClassSpecs(classEntry)
    .filter(
      (spec) =>
        !normalizedPrefix ||
        getClassScopedSpecKeywords(spec, classEntry).some((keyword) =>
          keyword.startsWith(normalizedPrefix),
        ),
    )
    .map((spec) => ({
      classEntry,
      name: titleCase(
        spec.slug.slice(0, -`-${classEntry.slug}`.length).replace(/-/g, " "),
      ),
      spec,
    }));
}

function getGlobalSpecGridItems(prefix: string): SpecGridItem[] {
  const normalizedPrefix = normalizeQuery(prefix);

  return specs
    .filter((spec) =>
      spec.aliases.some((alias) => alias.startsWith(normalizedPrefix)),
    )
    .map((spec) => {
      const classEntry = getClassForSpec(spec);
      return {
        classEntry,
        name: titleCase(spec.aliases[0]),
        spec,
      };
    });
}

function getMatchingClasses(prefix: string): ClassEntry[] {
  const normalizedPrefix = normalizeQuery(prefix);
  return wowClasses.filter((classEntry) =>
    classEntry.aliases.some((alias) => alias.startsWith(normalizedPrefix)),
  );
}

function getPages(mode: Mode, prefix = ""): PageEntry[] {
  const normalizedPrefix = normalizeQuery(prefix);

  return getPagesForMode(mode).filter(
    (page) =>
      !normalizedPrefix ||
      page.aliases.some(
        (alias) => alias !== "" && alias.startsWith(normalizedPrefix),
      ),
  );
}

function resolveSpecState(
  spec: SpecEntry,
  remainingQuery: string,
  suggestionQueryPrefix: string,
): GridState {
  const normalizedRemaining = normalizeQuery(remainingQuery);

  if (!normalizedRemaining) {
    return { kind: "modes", items: getAvailableModes(spec), spec };
  }

  const [firstToken, ...rest] = normalizedRemaining.split(" ");

  if (firstToken === "pve" || firstToken === "pvp") {
    const pagePrefix = rest.join(" ");
    return {
      kind: "pages",
      items: getPages(firstToken, pagePrefix),
      mode: firstToken,
      spec,
    };
  }

  const matchingModes = getAvailableModes(spec).filter((mode) =>
    mode.startsWith(firstToken),
  );

  if (rest.length === 0 && matchingModes.length > 0) {
    return { kind: "modes", items: matchingModes, spec };
  }

  return {
    kind: "results",
    suggestions: getSuggestions(
      [suggestionQueryPrefix, normalizedRemaining].filter(Boolean).join(" "),
    ),
  };
}

type QueryResolver = (normalizedQuery: string) => GridState | null;

function resolveEmptyQuery(normalizedQuery: string): GridState | null {
  if (!normalizedQuery) {
    return { kind: "classes", items: wowClasses };
  }
  return null;
}

function resolveExactGlobalSpec(normalizedQuery: string): GridState | null {
  const match = matchGlobalSpec(normalizedQuery);
  if (!match) return null;
  return resolveSpecState(
    match.item,
    match.remainingQuery,
    getShortestSpecAlias(match.item),
  );
}

function resolveExactClass(normalizedQuery: string): GridState | null {
  const match = matchClass(normalizedQuery);
  if (!match) return null;

  if (!match.remainingQuery) {
    return {
      kind: "specs",
      classEntry: match.item,
      items: getSpecGridItems(match.item),
    };
  }

  const specMatch = getExactClassScopedSpecMatch(
    match.item,
    match.remainingQuery,
  );
  if (specMatch) {
    return resolveSpecState(
      specMatch.item,
      specMatch.remainingQuery,
      getShortestSpecAlias(specMatch.item),
    );
  }

  return {
    kind: "specs",
    classEntry: match.item,
    items: getSpecGridItems(match.item, match.remainingQuery),
  };
}

function resolveClassPrefix(normalizedQuery: string): GridState | null {
  const matchingClasses = getMatchingClasses(normalizedQuery);
  if (matchingClasses.length > 0) {
    return { kind: "classes", items: matchingClasses };
  }
  return null;
}

function resolveSpecPrefix(normalizedQuery: string): GridState | null {
  const matchingSpecs = getGlobalSpecGridItems(normalizedQuery);
  if (matchingSpecs.length > 0) {
    return { kind: "specs", items: matchingSpecs };
  }
  return null;
}

export function resolveGridState(query: string): GridState {
  const normalizedQuery = normalizeQuery(query);

  const resolvers: QueryResolver[] = [
    resolveEmptyQuery,
    resolveExactGlobalSpec,
    resolveExactClass,
    resolveClassPrefix,
    resolveSpecPrefix,
  ];

  for (const resolver of resolvers) {
    const result = resolver(normalizedQuery);
    if (result !== null) return result;
  }

  return { kind: "results", suggestions: getSuggestions(query) };
}

export function getClassForSpec(spec: SpecEntry): ClassEntry {
  const classEntry = wowClasses.find((candidate) =>
    spec.slug.endsWith(`-${candidate.slug}`),
  );

  if (!classEntry) {
    throw new Error(`No class mapping found for spec slug "${spec.slug}"`);
  }

  return classEntry;
}

export function getClassIconPath(classEntry: ClassEntry): string {
  return `icons/${classEntry.representativeSpecSlug}.jpg`;
}

export function getSpecIconPath(spec: SpecEntry): string {
  return `icons/${spec.slug}.jpg`;
}

export function getSpecIconWithRolePath(spec: SpecEntry): string {
  return `icons/with-role/${spec.slug}.jpg`;
}

export function getShortestSpecAlias(spec: SpecEntry): string {
  return spec.aliases.reduce((shortest, alias) =>
    alias.length < shortest.length ? alias : shortest,
  );
}

export function getModeQuery(spec: SpecEntry, mode: Mode): string {
  return `${getShortestSpecAlias(spec)} ${mode}`;
}

export function getPageQuery(
  spec: SpecEntry,
  mode: Mode,
  page: PageEntry,
): string {
  const pageToken = page.aliases.find((alias) => alias !== "") ?? "guide";
  return `${getModeQuery(spec, mode)} ${pageToken}`;
}

export function getPageTitle(page: PageEntry): string {
  return page.displayTitle;
}
