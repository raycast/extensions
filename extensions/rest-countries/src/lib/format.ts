import type { Country } from "@yusifaliyevpro/countries";

type AnyCountry = Partial<Country>;

const numberFormatter = new Intl.NumberFormat("en-US");

export function formatNumber(value: number | undefined) {
  return value === undefined ? "—" : numberFormatter.format(value);
}

export function formatArea(country: AnyCountry) {
  if (!country.area) return "—";
  return `${formatNumber(Math.round(country.area.kilometers))} km²`;
}

export function formatCapitals(country: AnyCountry) {
  const capitals = country.capitals?.map((c) => c.name).filter(Boolean) ?? [];
  return capitals.length ? capitals.join(", ") : "—";
}

export function formatLanguages(country: AnyCountry) {
  return country.languages?.map((l) => l.name).filter(Boolean) ?? [];
}

export function formatCurrencies(country: AnyCountry) {
  return country.currencies?.map((c) => [c.name, c.symbol && `(${c.symbol})`].filter(Boolean).join(" ")) ?? [];
}

export function formatCallingCodes(country: AnyCountry) {
  return country.calling_codes?.length ? country.calling_codes.join(", ") : "—";
}

const MEMBERSHIP_LABELS: Partial<Record<keyof NonNullable<Country["memberships"]>, string>> = {
  un: "UN",
  eu: "EU",
  nato: "NATO",
  schengen: "Schengen",
  eurozone: "Eurozone",
  commonwealth: "Commonwealth",
  g7: "G7",
  g20: "G20",
  brics: "BRICS",
  oecd: "OECD",
  opec: "OPEC",
  asean: "ASEAN",
  african_union: "African Union",
  arab_league: "Arab League",
};

export function formatMemberships(country: AnyCountry) {
  if (!country.memberships) return [];
  return Object.entries(MEMBERSHIP_LABELS)
    .filter(([key]) => country.memberships?.[key as keyof Country["memberships"]])
    .map(([, label]) => label);
}

export function commonName(country: AnyCountry) {
  return country.names?.common ?? country.names?.official ?? "Unknown";
}
