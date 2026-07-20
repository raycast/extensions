import type { Probe } from "../api/globalping";
import type { LocationStat } from "./storage";
import { sanitizeText as sanitizeLocationText } from "./text";
import continents from "../assets/json/continents.json";
import countries from "../assets/json/countries.json";
import states from "../assets/json/usa-states.json";
import countryIso3 from "../assets/json/country-iso3.json";
import countryAliasesData from "../assets/json/country-aliases.json";
import regionAliasesData from "../assets/json/region-aliases.json";
import networkAliasesData from "../assets/json/network-aliases.json";

interface NamedCode {
  code: string;
  name: string;
}

const countriesByCode = new Map<string, string>();
const continentsByCode = new Map<string, string>();
const statesByCode = new Map<string, string>();

for (const entry of countries as NamedCode[]) {
  countriesByCode.set(entry.code.toUpperCase(), entry.name);
}

for (const entry of continents as NamedCode[]) {
  continentsByCode.set(entry.code.toUpperCase(), entry.name);
}

for (const entry of states as NamedCode[]) {
  statesByCode.set(`US-${entry.code.toUpperCase()}`, entry.name);
}

const iso3ByCode = countryIso3 as Record<string, string>;

function getCountryIso3(iso2: string): string | undefined {
  return iso3ByCode[iso2.toUpperCase()];
}

function getFullCountryAliases(iso2: string): string[] {
  const key = iso2.toLowerCase();
  const group = (countryAliasesData as string[][]).find((arr) => arr[0] === key);
  return group ? group.slice(1) : [];
}

function getNetworkPrefixes(network: string): string[] {
  const words = network.split(" ");
  const prefixes: string[] = [];
  for (let i = words.length; i > 0; i--) {
    prefixes.push(words.slice(0, i).join(" "));
  }
  return prefixes;
}

function getNetworkAliases(network: string): string[] {
  const key = network.toLowerCase();
  const group = (networkAliasesData as string[][]).find((arr) => arr.includes(key));
  return group ? group.filter((v) => v !== key) : [];
}

function getRegionAliases(region: string): string[] {
  const key = region.toLowerCase();
  const group = (regionAliasesData as string[][]).find((arr) => arr.includes(key));
  return group ? group.filter((v) => v !== key) : [];
}

export interface LocationSuggestion {
  id: string;
  section: string;
  title: string;
  value: string;
  subtitle?: string;
  count?: number;
  normalizedValue: string;
  inputValues?: string[];
}

export interface LocationSuggestionSection {
  title: string;
  items: LocationSuggestion[];
}

interface ParsedQuery {
  query: string;
  currentFragment: string;
  previousConditions: string[];
  queryPrefix: string;
}

export interface NormalizedLocationProbe {
  city: string;
  state: string;
  region: string;
  country: string;
  continent: string;
  network: string;
  tags: string[];
  /** 16-category index aligned with the Globalping server filtering logic */
  categories: string[][];
}

interface SuggestionCandidate {
  section: string;
  title: string;
  value: string;
  subtitle?: string;
  count: number;
  normalizedValue: string;
  inputValues?: string[];
}

const SECTION_PRIORITY = new Map<string, number>([
  ["Cities", 0],
  ["Countries", 1],
  ["States", 2],
  ["Regions", 3],
  ["Continents", 4],
  ["Networks", 5],
  ["Tags", 6],
  ["Quick Picks", 7],
  ["Recent", 8],
]);

function escapeRegExp(value: string): string {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

function getCountryName(code: string): string {
  return countriesByCode.get(code.toUpperCase()) ?? code.toUpperCase();
}

function getContinentName(code: string): string {
  return continentsByCode.get(code.toUpperCase()) ?? code.toUpperCase();
}

function getStateName(code: string): string {
  return statesByCode.get(code.toUpperCase()) ?? code.toUpperCase();
}

function parseLocationQuery(value: string): ParsedQuery {
  const query = sanitizeLocationText(value);
  const queries = query.split(",");
  const currentQuery = queries.pop() ?? "";
  const previousQueries = queries.map((part) => part.trim()).filter(Boolean);
  const currentParts = currentQuery.split("+");
  const currentPartRaw = currentParts.pop() ?? "";
  const previousConditions = currentParts.map((part) => part.trim()).filter(Boolean);
  const currentFragmentLeadingWhitespace = currentPartRaw.match(/^\s+/)?.[0] ?? "";
  const currentFragment = currentPartRaw.trim();

  let queryPrefix = previousQueries.join(",");
  if (queryPrefix) {
    queryPrefix += ",";
  }

  if (previousConditions.length > 0) {
    queryPrefix += `${previousConditions.join("+")}+`;
  }

  queryPrefix += currentFragmentLeadingWhitespace;

  return {
    query,
    currentFragment,
    previousConditions,
    queryPrefix,
  };
}

export function normalizeLocationProbes(probes: Probe[]): NormalizedLocationProbe[] {
  return probes.map((probe) => {
    const countryCode = sanitizeLocationText((probe.location.country ?? "").toUpperCase());
    const stateCode = sanitizeLocationText((probe.location.state ?? "").toUpperCase());
    const normalizedStateCode = countryCode === "US" && stateCode ? `US-${stateCode}` : "";
    const countryName = getCountryName(countryCode);
    const continentCode = sanitizeLocationText((probe.location.continent ?? "").toUpperCase());
    const continentName = getContinentName(continentCode);
    const city = sanitizeLocationText(probe.location.city ?? "");
    const region = sanitizeLocationText(probe.location.region ?? "");
    const network = sanitizeLocationText(probe.location.network ?? "");
    const tags = (probe.tags ?? [])
      .map((tag) => sanitizeLocationText(tag))
      .filter((tag) => tag && !tag.startsWith("u-"));

    // Full country aliases (used both in countryValues and in the index)
    const fullCountryAliases = getFullCountryAliases(countryCode);
    const countryValues = [countryName, countryCode, ...fullCountryAliases];
    const stateValues = normalizedStateCode ? [normalizedStateCode, getStateName(normalizedStateCode), stateCode] : [];
    const cityValues = [city, ...stateValues, countryName, countryCode];
    const continentValues = [continentName, continentCode];

    // Normalise a value for the index: lowercase + hyphens → spaces (matches server behavior)
    const norm = (v: string) => v.toLowerCase().replaceAll("-", " ");

    const countryIso3Value = getCountryIso3(countryCode);
    const normalizedNetwork = norm(network);
    const netPrefixes = network ? getNetworkPrefixes(normalizedNetwork) : [];
    const netAliases = network ? getNetworkAliases(normalizedNetwork) : [];
    const normalizedRegion = norm(region);
    const regAliases = region ? getRegionAliases(normalizedRegion) : [];
    const asn = probe.location.asn ? `as${probe.location.asn}` : "";

    // 16-category index (positions mirror the server's ProbeIndex)
    const categories: string[][] = [
      /* 00 */ countryCode ? [norm(countryCode)] : [],
      /* 01 */ countryIso3Value ? [norm(countryIso3Value)] : [],
      /* 02 */ countryName ? [norm(countryName)] : [],
      /* 03 */ fullCountryAliases.map(norm),
      /* 04 */ city ? [norm(city)] : [],
      /* 05 */ stateCode ? [norm(stateCode)] : [],
      /* 06 */ normalizedStateCode ? [norm(normalizedStateCode)] : [],
      /* 07 */ normalizedStateCode ? [norm(getStateName(normalizedStateCode))] : [],
      /* 08 */ continentCode ? [norm(continentCode)] : [],
      /* 09 */ continentName ? [norm(continentName)] : [],
      /* 10 */ region ? [normalizedRegion] : [],
      /* 11 */ regAliases,
      /* 12 */ asn ? [asn] : [],
      /* 13 */ tags.map(norm),
      /* 14 */ netPrefixes,
      /* 15 */ netAliases,
    ];

    return {
      city: cityValues.filter(Boolean).join("\n"),
      state: stateValues.filter(Boolean).join("\n"),
      region,
      country: countryValues.filter(Boolean).join("\n"),
      continent: continentValues.filter(Boolean).join("\n"),
      network,
      tags,
      categories,
    };
  });
}

// Builds one Set per category, containing all known values across all probes.
// Used to determine whether a keyword maps exactly to a known category (for precise filtering).
function buildCategoryIndex(probes: NormalizedLocationProbe[]): Set<string>[] {
  const sets: Set<string>[] = Array.from({ length: 16 }, () => new Set<string>());
  for (const probe of probes) {
    for (let i = 0; i < 16; i++) {
      for (const v of probe.categories[i] ?? []) {
        sets[i]!.add(v);
      }
    }
  }
  return sets;
}

function findExactCategory(keyword: string, index: Set<string>[]): number {
  // ASN: special regex match for category 12
  if (/^as\d+$/.test(keyword)) return 12;
  return index.findIndex((set) => set.has(keyword));
}

function filterProbes(
  normalizedProbes: NormalizedLocationProbe[],
  conditions: string[],
  categoryIndex: Set<string>[],
): NormalizedLocationProbe[] {
  if (conditions.length === 0) return normalizedProbes;

  return conditions.reduce((filtered, condition) => {
    const keyword = sanitizeLocationText(condition).toLowerCase().replaceAll("-", " ");
    if (!keyword || keyword === "world") return filtered;

    const exactCategory = findExactCategory(keyword, categoryIndex);

    if (exactCategory !== -1) {
      // Exact match found → filter on that specific category only
      return filtered.filter((probe) => probe.categories[exactCategory]?.includes(keyword));
    }

    // No exact category → partial match across all categories
    return filtered.filter((probe) => probe.categories.some((cat) => cat.some((v) => v.includes(keyword))));
  }, normalizedProbes);
}

function countByValue(values: SuggestionCandidate[]): SuggestionCandidate[] {
  const byValue = new Map<string, SuggestionCandidate>();

  for (const item of values) {
    // Networks are deduped case-insensitively (ISPs can appear with varied casing)
    const key = item.section === "Networks" ? item.value.toLowerCase() : item.value;
    const existing = byValue.get(key);

    if (existing) {
      existing.count += 1;
      continue;
    }

    byValue.set(key, { ...item });
  }

  return [...byValue.values()].sort((left, right) => right.count - left.count || left.title.localeCompare(right.title));
}

function sortByRelevance(left: LocationSuggestion, right: LocationSuggestion): number {
  const leftPriority = SECTION_PRIORITY.get(left.section) ?? Number.MAX_SAFE_INTEGER;
  const rightPriority = SECTION_PRIORITY.get(right.section) ?? Number.MAX_SAFE_INTEGER;

  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  if ((left.count ?? 0) !== (right.count ?? 0)) {
    return (right.count ?? 0) - (left.count ?? 0);
  }

  return left.title.localeCompare(right.title);
}

function flattenSections(sections: LocationSuggestionSection[]): LocationSuggestion[] {
  return sections.flatMap((section) => section.items);
}

function dedupeSuggestions(items: LocationSuggestion[]): LocationSuggestion[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = `${item.section}:${item.value}`.toLowerCase();
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function pickSuggestions(
  items: LocationSuggestion[],
  maxItems: number,
  excludedValues = new Set<string>(),
): LocationSuggestion[] {
  const picked: LocationSuggestion[] = [];

  for (const item of items) {
    const key = `${item.section}:${item.value}`.toLowerCase();
    if (excludedValues.has(key)) {
      continue;
    }

    excludedValues.add(key);
    picked.push(item);

    if (picked.length === maxItems) {
      break;
    }
  }

  return picked;
}

function buildSuggestionIndex(filteredProbes: NormalizedLocationProbe[]): LocationSuggestionSection[] {
  const worldCount = filteredProbes.length;
  const tags = countByValue(
    filteredProbes.flatMap((probe) =>
      probe.tags.map((tag) => ({
        section: "Tags",
        title: tag,
        value: tag,
        subtitle: "Tag filter",
        count: 1,
        normalizedValue: tag.toLowerCase(),
      })),
    ),
  );
  const countries = countByValue(
    filteredProbes.map((probe) => {
      const [countryName, countryCode] = probe.country.split("\n");

      return {
        section: "Countries",
        title: countryName,
        value: countryName,
        subtitle: countryCode ? `Country · code ${countryCode}` : "Country",
        count: 1,
        normalizedValue: probe.country.toLowerCase(),
        inputValues: [countryName, countryCode, ...getFullCountryAliases(countryCode ?? "")].filter(Boolean),
      };
    }),
  );
  const continents = countByValue(
    filteredProbes.map((probe) => {
      const [continentName, continentCode] = probe.continent.split("\n");

      return {
        section: "Continents",
        title: continentName,
        value: continentName,
        subtitle: continentCode ? `Continent · code ${continentCode}` : "Continent",
        count: 1,
        normalizedValue: probe.continent.toLowerCase(),
        inputValues: [continentName, continentCode].filter(Boolean),
      };
    }),
  );
  const regions = countByValue(
    filteredProbes
      .map((probe) => sanitizeLocationText(probe.region))
      .filter(Boolean)
      .map((region) => ({
        section: "Regions",
        title: region,
        value: region,
        subtitle: "Region",
        count: 1,
        normalizedValue: region.toLowerCase(),
      })),
  );
  const stateCandidates: SuggestionCandidate[] = [];
  const cityCandidates: SuggestionCandidate[] = [];

  for (const probe of filteredProbes) {
    const [stateCode, stateName, shortStateCode] = probe.state.split("\n");
    if (stateCode) {
      stateCandidates.push({
        section: "States",
        title: stateName || stateCode,
        value: stateCode,
        subtitle: `US state · ${stateCode}`,
        count: 1,
        normalizedValue: [stateCode, stateName, shortStateCode].filter(Boolean).join("\n").toLowerCase(),
        inputValues: [stateCode, stateName, shortStateCode].filter(Boolean),
      });
    }

    const cityParts = probe.city.split("\n");
    const city = cityParts[0];
    if (!city) {
      continue;
    }

    // US cities: [city, US-XX, StateName, XX, CountryName, CountryCode] (6 parts)
    // Non-US cities: [city, CountryName, CountryCode] (3 parts)
    const hasState = cityParts[1]?.startsWith("US-");
    const cityStateCode = hasState ? cityParts[1] : undefined;
    const cityStateName = hasState ? cityParts[2] : undefined;
    const cityShortStateCode = hasState ? cityParts[3] : undefined;
    const countryName = hasState ? cityParts[4] : cityParts[1];
    const countryCode = hasState ? cityParts[5] : cityParts[2];

    const locationCode = cityStateCode || countryCode;
    const subtitle = cityStateCode
      ? `City · ${cityStateName || cityStateCode} • ${countryName} (${countryCode})`
      : countryCode
        ? `City · ${countryName} (${countryCode})`
        : undefined;

    cityCandidates.push({
      section: "Cities",
      title: city,
      value: locationCode ? `${city}+${locationCode}` : city,
      subtitle,
      count: 1,
      normalizedValue: [city, cityStateCode, cityStateName, cityShortStateCode, countryName, countryCode]
        .filter(Boolean)
        .join("\n")
        .toLowerCase(),
      inputValues: [
        city,
        locationCode,
        cityStateCode,
        cityStateName,
        cityShortStateCode,
        countryName,
        countryCode,
      ].filter(Boolean) as string[],
    });
  }

  const states = countByValue(stateCandidates);
  const cities = countByValue(cityCandidates);
  const networks = countByValue(
    filteredProbes
      .map((probe) => sanitizeLocationText(probe.network))
      .filter((network) => network && !network.includes(","))
      .map((network) => ({
        section: "Networks",
        title: network,
        value: network,
        subtitle: "Network / provider",
        count: 1,
        normalizedValue: network.toLowerCase(),
      })),
  );

  return [
    {
      title: "Quick Picks",
      items: [
        {
          id: "quick:world",
          section: "Quick Picks",
          title: "World",
          value: "world",
          subtitle: "Anywhere",
          count: worldCount,
          normalizedValue: "world\nglobal",
          inputValues: ["world", "global"],
        },
      ],
    },
    { title: "Countries", items: countries.map(toSuggestion) },
    { title: "Continents", items: continents.map(toSuggestion) },
    { title: "Regions", items: regions.map(toSuggestion) },
    { title: "States", items: states.map(toSuggestion) },
    { title: "Cities", items: cities.map(toSuggestion) },
    { title: "Networks", items: networks.map(toSuggestion) },
    { title: "Tags", items: tags.map(toSuggestion) },
  ].filter((section) => section.items.length > 0);
}

function toSuggestion(candidate: SuggestionCandidate): LocationSuggestion {
  return {
    id: `${candidate.section}:${candidate.value}`,
    section: candidate.section,
    title: candidate.title,
    value: candidate.value,
    subtitle: candidate.subtitle,
    count: candidate.count,
    normalizedValue: candidate.normalizedValue,
    inputValues: candidate.inputValues,
  };
}

function getRank(normalizedValue: string, query: string): number {
  const normalizedQuery = sanitizeLocationText(query).toLowerCase();
  if (!normalizedQuery) {
    return 0;
  }

  const rankedPatterns = [
    new RegExp(`^${escapeRegExp(normalizedQuery)}$`, "im"),
    new RegExp(`^${escapeRegExp(normalizedQuery)}`, "im"),
    new RegExp(`\\b${escapeRegExp(normalizedQuery)}\\b`, "im"),
    new RegExp(`\\b${escapeRegExp(normalizedQuery)}`, "im"),
    new RegExp(`${escapeRegExp(normalizedQuery)}`, "im"),
  ];

  for (const [index, pattern] of rankedPatterns.entries()) {
    if (pattern.test(normalizedValue)) {
      return index;
    }
  }

  return Number.POSITIVE_INFINITY;
}

function buildRecentSection(recentLocations: LocationStat[], query?: string): LocationSuggestionSection[] {
  const normalizedQuery = sanitizeLocationText(query ?? "").toLowerCase();
  const items = recentLocations
    .map((entry) => ({
      id: `recent:${entry.location}`,
      section: "Recent",
      title: entry.location,
      value: entry.location,
      subtitle: "Recently used",
      count: entry.count,
      normalizedValue: entry.location.toLowerCase(),
    }))
    .filter((entry) => !normalizedQuery || getRank(entry.normalizedValue, normalizedQuery) < Number.POSITIVE_INFINITY)
    .sort((left, right) => {
      if (!normalizedQuery) {
        return (right.count ?? 0) - (left.count ?? 0) || left.title.localeCompare(right.title);
      }

      const rankDelta =
        getRank(left.normalizedValue, normalizedQuery) - getRank(right.normalizedValue, normalizedQuery);
      if (rankDelta !== 0) {
        return rankDelta;
      }

      return (right.count ?? 0) - (left.count ?? 0) || left.title.localeCompare(right.title);
    })
    .slice(0, normalizedQuery ? 3 : 4);

  return items.length > 0 ? [{ title: normalizedQuery ? "Recent Matches" : "Recent", items }] : [];
}

function buildRawInputSection(parsedQuery: ParsedQuery): LocationSuggestionSection | null {
  if (!parsedQuery.query) {
    return null;
  }

  const subtitle =
    parsedQuery.previousConditions.length > 0 || parsedQuery.query.includes(",")
      ? "Send exactly this combined value to Globalping"
      : "Use exactly what you typed";

  return {
    title: "Use Typed Value",
    items: [
      {
        id: "custom:raw",
        section: "Use Typed Value",
        title: `Use exactly "${parsedQuery.query}"`,
        value: parsedQuery.query,
        subtitle,
        normalizedValue: parsedQuery.query.toLowerCase(),
      },
    ],
  };
}

function buildRankedSuggestions(
  items: LocationSuggestion[],
  query: string,
): Array<LocationSuggestion & { rank: number }> {
  return items
    .map((item) => ({ item, rank: getRank(item.normalizedValue, query) }))
    .filter((entry) => Number.isFinite(entry.rank))
    .sort((left, right) => {
      if (left.rank !== right.rank) {
        return left.rank - right.rank;
      }

      const sectionDelta =
        (SECTION_PRIORITY.get(left.item.section) ?? Number.MAX_SAFE_INTEGER) -
        (SECTION_PRIORITY.get(right.item.section) ?? Number.MAX_SAFE_INTEGER);
      if (sectionDelta !== 0) {
        return sectionDelta;
      }

      if ((left.item.count ?? 0) !== (right.item.count ?? 0)) {
        return (right.item.count ?? 0) - (left.item.count ?? 0);
      }

      return left.item.title.localeCompare(right.item.title);
    })
    .map((entry) => ({ ...entry.item, rank: entry.rank }));
}

function buildSection(title: string, items: LocationSuggestion[]): LocationSuggestionSection[] {
  return items.length > 0 ? [{ title, items }] : [];
}

export function buildLocationSuggestionSectionsFromNormalized(
  normalizedProbes: NormalizedLocationProbe[],
  recentLocations: LocationStat[],
  rawQuery: string,
): LocationSuggestionSection[] {
  const categoryIndex = buildCategoryIndex(normalizedProbes);
  const parsedQuery = parseLocationQuery(rawQuery);
  const filteredProbes = filterProbes(normalizedProbes, parsedQuery.previousConditions, categoryIndex);
  const baseSections = buildSuggestionIndex(filteredProbes);
  const allSuggestions = dedupeSuggestions(flattenSections(baseSections)).sort(sortByRelevance);
  const compositionMode =
    parsedQuery.previousConditions.length > 0 || sanitizeLocationText(rawQuery).trimEnd().endsWith("+");
  const rawInputSection = buildRawInputSection(parsedQuery);

  if (!parsedQuery.query) {
    const seen = new Set<string>();
    const popularPicks = pickSuggestions(
      allSuggestions.filter((item) => item.section !== "Networks" && item.section !== "Tags" && item.value !== "world"),
      7,
      seen,
    );
    const filterIdeas = pickSuggestions(
      allSuggestions.filter((item) => item.section === "Networks" || item.section === "Tags"),
      4,
      seen,
    );

    return [
      ...buildRecentSection(recentLocations),
      ...buildSection("Popular Picks", [
        ...pickSuggestions(
          allSuggestions.filter((item) => item.value === "world"),
          1,
          seen,
        ),
        ...popularPicks,
      ]),
      ...buildSection("Filter Ideas", filterIdeas),
    ];
  }

  const queryForRanking = parsedQuery.currentFragment || parsedQuery.query;
  const rankedSuggestions = buildRankedSuggestions(allSuggestions, queryForRanking);
  const seen = new Set<string>();

  // Geo matches (cities, countries, continents, regions, states) — shown first
  const geoMatches = pickSuggestions(
    rankedSuggestions.filter((item) => item.section !== "Networks" && item.section !== "Tags"),
    6,
    seen,
  );
  // Tags and Networks are shown in their own separate sections, like on globalping.io
  const tagMatches = pickSuggestions(
    rankedSuggestions.filter((item) => item.section === "Tags"),
    compositionMode ? 10 : 5,
    seen,
  );
  const networkMatches = pickSuggestions(
    rankedSuggestions.filter((item) => item.section === "Networks"),
    compositionMode ? 10 : 6,
    seen,
  );
  const moreSuggestions = pickSuggestions(rankedSuggestions, compositionMode ? 6 : 4, seen);

  return [
    ...(rawInputSection ? [rawInputSection] : []),
    ...buildRecentSection(recentLocations, queryForRanking),
    ...buildSection(compositionMode ? "Add to Current Filter" : "Best Matches", geoMatches),
    ...buildSection("Tags", tagMatches),
    ...buildSection("Networks", networkMatches),
    ...buildSection("More Suggestions", moreSuggestions),
  ];
}

export function applyLocationSuggestion(rawQuery: string, suggestion: LocationSuggestion): string {
  const parsedQuery = parseLocationQuery(rawQuery);
  if (suggestion.section === "Use Typed Value") {
    return suggestion.value;
  }

  const normalizedPreviousConditions = parsedQuery.previousConditions.map((part) => part.toLowerCase());
  const matchingInputValue = suggestion.inputValues?.find(
    (value) => value.toLowerCase() === parsedQuery.currentFragment.toLowerCase(),
  );
  const nextValue = matchingInputValue || suggestion.value;
  const nextParts = nextValue.split("+").filter((part) => !normalizedPreviousConditions.includes(part.toLowerCase()));

  return `${parsedQuery.queryPrefix}${nextParts.join("+")}`;
}

export function formatLocationPickerSubtitle(value: string): string {
  return sanitizeLocationText(value) || "world";
}
