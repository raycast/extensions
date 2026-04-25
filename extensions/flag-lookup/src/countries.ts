import countries from "./countries.json";

interface LocalizedName {
  official: string;
  common: string;
}

function normalizeQuery(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export interface Country {
  cca2: string;
  cca3: string;
  altSpellings?: string[];
  name: {
    common: string;
    official: string;
    nativeName?: Record<string, LocalizedName | undefined>;
  };
  flags: {
    webp?: string;
    png?: string;
    svg?: string;
    alt?: string;
  };
  coatOfArms?: {
    webp?: string;
    png?: string;
    svg?: string;
  };
  population: number;
  area?: number;
  capital?: string[];
  region: string;
  subregion?: string;
  independent?: boolean;
  landlocked?: boolean;
  idd?: {
    root?: string;
    suffixes?: string[];
  };
  languages?: Record<string, string>;
  currencies?: Record<string, { name: string; symbol?: string }>;
  demonyms?: Record<string, { f?: string; m?: string }>;
  translations?: Record<string, LocalizedName | undefined>;
  tld?: string[];
  borders?: string[];
  maps: {
    googleMaps?: string;
    openStreetMaps?: string;
  };
  timezones?: string[];
  car?: {
    side?: string;
    signs?: string[];
  };
  searchTags?: {
    flagColors?: string[];
    flagFeatures?: string[];
  };
}

export function getCountries(): Country[] {
  return countries as unknown as Country[];
}

export function searchCountries(countries: Country[], query: string): Country[] {
  const lowerQuery = normalizeQuery(query);
  if (!lowerQuery) {
    return countries;
  }

  return countries.filter((country) => {
    const commonName = normalizeQuery(country.name.common);
    const officialName = normalizeQuery(country.name.official);
    const capital = normalizeQuery(country.capital?.[0] || "");
    const region = normalizeQuery(country.region || "");
    const cca2 = normalizeQuery(country.cca2 || "");
    const cca3 = normalizeQuery(country.cca3 || "");
    const tlds = (country.tld || []).map((tld) => normalizeQuery(tld));
    const altSpellings = (country.altSpellings || []).map((spelling) => normalizeQuery(spelling));
    const nativeNames = Object.values(country.name.nativeName || {})
      .filter((name): name is LocalizedName => Boolean(name))
      .map((name) => normalizeQuery(name.common));
    const translatedNames = Object.values(country.translations || {})
      .filter((name): name is LocalizedName => Boolean(name))
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
  });
}

export function findDirectCountryMatch(countries: Country[], query: string): Country | undefined {
  const normalizedQuery = normalizeQuery(query);
  if (!normalizedQuery) {
    return undefined;
  }

  return countries.find((country) => {
    const exactTerms = [
      country.name.common,
      country.name.official,
      country.cca2,
      country.cca3,
      ...(country.altSpellings || []),
      ...Object.values(country.name.nativeName || {})
        .filter((name): name is LocalizedName => Boolean(name))
        .flatMap((name) => [name.common, name.official]),
      ...Object.values(country.translations || {})
        .filter((name): name is LocalizedName => Boolean(name))
        .flatMap((name) => [name.common, name.official]),
    ];

    return exactTerms.some((term) => normalizeQuery(term) === normalizedQuery);
  });
}

export function getNativeName(country: Country): string {
  const nativeNames = Object.values(country.name.nativeName || {}).filter((name): name is LocalizedName =>
    Boolean(name),
  );
  if (nativeNames.length > 0) {
    return nativeNames[0].common;
  }
  return "";
}

export function getLanguages(country: Country): string {
  return Object.values(country.languages || {}).join(", ");
}

export function getCurrencies(country: Country): string {
  return Object.values(country.currencies || {})
    .map((c) => (c.symbol ? `${c.name} (${c.symbol})` : c.name))
    .join(", ");
}

export function getCurrencySymbols(country: Country): string {
  return Object.values(country.currencies || {})
    .flatMap((currency) => (currency.symbol ? [currency.symbol] : []))
    .filter((symbol, index, symbols) => symbols.indexOf(symbol) === index)
    .join(", ");
}

export function formatPopulation(num: number): string {
  return num.toLocaleString();
}

export function formatArea(area?: number): string {
  if (!area) {
    return "";
  }

  return `${area.toLocaleString()} km²`;
}

export function getFlagEmoji(countryCode: string): string {
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    return "";
  }

  return Array.from(countryCode)
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

export function getCallingCode(country: Country): string {
  if (!country.idd?.root || !country.idd.suffixes?.length) {
    return "";
  }

  return country.idd.suffixes.map((suffix) => `${country.idd?.root}${suffix}`).join(", ");
}

export function getDemonyms(country: Country): string {
  return Object.values(country.demonyms || {})
    .flatMap((demonym) => [demonym.m, demonym.f])
    .filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index)
    .join(", ");
}

export function getFlagImage(country: Country): string {
  return country.flags.webp || country.flags.svg || country.flags.png || "";
}

export function getCoatOfArmsImage(country: Country): string {
  return country.coatOfArms?.webp || country.coatOfArms?.svg || country.coatOfArms?.png || "";
}

export function getWikipediaUrl(country: Country): string {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(country.name.common.replaceAll(" ", "_"))}`;
}
