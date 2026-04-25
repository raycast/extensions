import { Country } from "./countries";

// --- Types ---

export type TagCategory = "color" | "feature" | "region" | "subregion" | "language" | "currency" | "driving";

export interface TagDefinition {
  key: string;
  token: string;
  label: string;
  category: TagCategory;
  countryCount: number;
}

// --- Helpers ---

function normalizeQuery(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

const CATEGORY_ORDER: TagCategory[] = ["color", "feature", "region", "subregion", "language", "currency", "driving"];

// --- Functions ---

export function buildTagCatalog(countries: Country[]): TagDefinition[] {
  const tagCounters = new Map<string, { label: string; category: TagCategory; count: number }>();

  function increment(category: TagCategory, token: string, label: string): void {
    const key = `${category}:${token}`;
    const existing = tagCounters.get(key);
    if (existing) {
      existing.count++;
    } else {
      tagCounters.set(key, { label, category, count: 1 });
    }
  }

  for (const country of countries) {
    if (country.region) {
      increment("region", country.region.toLowerCase(), country.region);
    }

    if (country.subregion) {
      increment("subregion", country.subregion.toLowerCase(), country.subregion);
    }

    if (country.languages) {
      for (const [, name] of Object.entries(country.languages)) {
        increment("language", name.toLowerCase(), name);
      }
    }

    if (country.currencies) {
      for (const [code, info] of Object.entries(country.currencies)) {
        const token = code.toLowerCase();
        const label = `${info.name} (${code})`;
        increment("currency", token, label);
      }
    }

    if (country.searchTags?.flagColors) {
      for (const color of country.searchTags.flagColors) {
        const token = color.toLowerCase();
        increment("color", token, color.charAt(0).toUpperCase() + color.slice(1).toLowerCase());
      }
    }

    if (country.searchTags?.flagFeatures) {
      for (const feature of country.searchTags.flagFeatures) {
        const token = feature.toLowerCase();
        increment("feature", token, feature.charAt(0).toUpperCase() + feature.slice(1).toLowerCase());
      }
    }

    if (country.car?.side) {
      const side = country.car.side.toLowerCase();
      const label = `Drives on the ${side}`;
      increment("driving", side, label);
    }
  }

  const catalog: TagDefinition[] = [];
  for (const [key, { label, category, count }] of tagCounters) {
    catalog.push({
      key,
      token: key.slice(category.length + 1),
      label,
      category,
      countryCount: count,
    });
  }

  catalog.sort((a, b) => {
    const catDiff = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
    if (catDiff !== 0) return catDiff;
    return b.countryCount - a.countryCount;
  });

  return catalog;
}

export function getTagsByCategory(catalog: TagDefinition[]): Map<TagCategory, TagDefinition[]> {
  const grouped = new Map<TagCategory, TagDefinition[]>();
  for (const tag of catalog) {
    const list = grouped.get(tag.category) || [];
    list.push(tag);
    grouped.set(tag.category, list);
  }
  return grouped;
}

export function filterByTags(countries: Country[], activeTags: TagDefinition[]): Country[] {
  let result = countries;

  for (const tag of activeTags) {
    result = result.filter((country) => countryMatchesTag(country, tag));
  }

  return result;
}

export function filterByText(countries: Country[], query: string): Country[] {
  const lowerQuery = normalizeQuery(query);
  if (!lowerQuery) return countries;
  return countries.filter((country) => countryMatchesFreeText(country, lowerQuery));
}

function countryMatchesTag(country: Country, tag: TagDefinition): boolean {
  switch (tag.category) {
    case "region":
      return country.region.toLowerCase() === tag.token;
    case "subregion":
      return (country.subregion || "").toLowerCase() === tag.token;
    case "language":
      return Object.entries(country.languages || {}).some(
        ([code, name]) => name.toLowerCase() === tag.token || code.toLowerCase() === tag.token,
      );
    case "currency":
      return Object.keys(country.currencies || {}).some((code) => code.toLowerCase() === tag.token);
    case "color":
      return (country.searchTags?.flagColors || []).some((c) => c.toLowerCase() === tag.token);
    case "feature":
      return (country.searchTags?.flagFeatures || []).some((f) => f.toLowerCase() === tag.token);
    case "driving":
      return (country.car?.side || "").toLowerCase() === tag.token;
  }
}

function countryMatchesFreeText(country: Country, lowerQuery: string): boolean {
  const commonName = normalizeQuery(country.name.common);
  const officialName = normalizeQuery(country.name.official);
  const capital = normalizeQuery(country.capital?.[0] || "");
  const region = normalizeQuery(country.region || "");
  const cca2 = normalizeQuery(country.cca2 || "");
  const cca3 = normalizeQuery(country.cca3 || "");
  const tlds = (country.tld || []).map((tld) => normalizeQuery(tld));
  const altSpellings = (country.altSpellings || []).map((spelling) => normalizeQuery(spelling));
  const nativeNames = Object.values(country.name.nativeName || {})
    .filter((name): name is { official: string; common: string } => Boolean(name))
    .map((name) => normalizeQuery(name.common));
  const translatedNames = Object.values(country.translations || {})
    .filter((name): name is { official: string; common: string } => Boolean(name))
    .flatMap((name) => [normalizeQuery(name.common), normalizeQuery(name.official)]);
  const demonyms = Object.values(country.demonyms || {})
    .flatMap((demonym) => [demonym.f, demonym.m])
    .filter((value): value is string => Boolean(value))
    .map((value) => normalizeQuery(value));

  return (
    commonName.includes(lowerQuery) ||
    officialName.includes(lowerQuery) ||
    capital.includes(lowerQuery) ||
    region.includes(lowerQuery) ||
    cca2.includes(lowerQuery) ||
    cca3.includes(lowerQuery) ||
    tlds.some((tld) => tld.includes(lowerQuery)) ||
    altSpellings.some((spelling) => spelling.includes(lowerQuery)) ||
    nativeNames.some((name) => name.includes(lowerQuery)) ||
    translatedNames.some((name) => name.includes(lowerQuery)) ||
    demonyms.some((demonym) => demonym.includes(lowerQuery))
  );
}

const CATEGORY_LABELS: Record<TagCategory, string> = {
  color: "Flag Colors",
  feature: "Flag Features",
  region: "Regions",
  subregion: "Subregions",
  language: "Languages",
  currency: "Currencies",
  driving: "Driving Side",
};

export function getCategoryLabel(category: TagCategory): string {
  return CATEGORY_LABELS[category];
}
