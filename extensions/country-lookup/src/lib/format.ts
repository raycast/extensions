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

export function formatDemonym(country: AnyCountry) {
  const demonyms = country.demonyms;
  if (!demonyms) return "—";
  const preferred = demonyms.eng ?? Object.values(demonyms)[0];
  return preferred?.m || preferred?.f || "—";
}

export function formatBoolean(value: boolean | undefined) {
  return value === undefined ? "—" : value ? "Yes" : "No";
}

export function formatNativeNames(country: AnyCountry) {
  const native = country.names?.native;
  if (!native) return "—";
  const names = [
    ...new Set(
      Object.values(native)
        .map((n) => n.common)
        .filter(Boolean),
    ),
  ];
  return names.length ? names.join(", ") : "—";
}

export function formatVehicleSigns(country: AnyCountry) {
  const signs = country.cars?.signs?.filter(Boolean) ?? [];
  return signs.length ? signs.join(", ") : "—";
}

export function formatNumberFormat(country: AnyCountry) {
  const format = country.number_format;
  if (!format) return "—";
  const thousands = format.thousands_separator ?? "";
  const decimal = format.decimal_separator ?? "";
  if (!thousands && !decimal) return "—";
  return `1${thousands}234${thousands}567${decimal}89`;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function formatDayMonth(value: { day: number; month: number } | undefined) {
  if (!value?.month) return "—";
  const month = MONTHS[value.month - 1];
  if (!month) return "—";
  return value.day ? `${value.day} ${month}` : month;
}

export function formatUnits(country: AnyCountry) {
  const units = country.units;
  if (!units) return "—";
  const system = units.measurement_system
    ? units.measurement_system.charAt(0).toUpperCase() + units.measurement_system.slice(1)
    : undefined;
  return [system, units.temperature_scale].filter(Boolean).join(" · ") || "—";
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

/**
 * Renders all of a country's detail fields as plain text, mirroring the detail
 * view. The header is the common name prefixed with the flag emoji (when any).
 * `namesByCode` maps alpha-3 codes to names so borders read as country names.
 */
export function formatCountryText(country: AnyCountry, namesByCode?: Map<string, string>) {
  const lines: string[] = [];

  const flag = country.flag?.emoji ? `${country.flag.emoji} ` : "";
  lines.push(`${flag}${commonName(country)}`, "");

  lines.push(`Official Name: ${country.names?.official ?? "—"}`);
  lines.push(`Native Name: ${formatNativeNames(country)}`);
  lines.push(`Country Code: ${country.codes?.alpha_2 || "—"}`);
  lines.push(`Alpha-3 Code: ${country.codes?.alpha_3 || "—"}`);
  lines.push(`Numeric Code: ${country.codes?.ccn3 || "—"}`);
  if (country.codes?.cioc) lines.push(`IOC Code: ${country.codes.cioc}`);
  if (country.codes?.fifa) lines.push(`FIFA Code: ${country.codes.fifa}`);
  lines.push(`Capital: ${formatCapitals(country)}`);
  lines.push(`Region: ${[country.region, country.subregion].filter(Boolean).join(" · ") || "—"}`);
  lines.push(`Continent: ${country.continents?.length ? country.continents.join(", ") : "—"}`);
  lines.push(`Population: ${formatNumber(country.population)}`);
  lines.push(`Area: ${formatArea(country)}`);
  lines.push(`Landlocked: ${formatBoolean(country.landlocked)}`);
  lines.push(`Inhabitants: ${formatDemonym(country)}`);
  lines.push(`Units: ${formatUnits(country)}`);
  lines.push(`Government: ${country.government_type || "—"}`);

  const languages = formatLanguages(country);
  if (languages.length) lines.push(`Languages: ${languages.join(", ")}`);

  const currencies = formatCurrencies(country);
  if (currencies.length) lines.push(`Currencies: ${currencies.join(", ")}`);

  lines.push(`Calling Code: ${formatCallingCodes(country)}`);
  lines.push(`Start of Week: ${country.date?.start_of_week ?? "—"}`);
  lines.push(`Academic Year Start: ${formatDayMonth(country.date?.academic_year_start)}`);
  lines.push(`Fiscal Year Start: ${formatDayMonth(country.date?.fiscal_year_start?.government)}`);
  lines.push(`Driving Side: ${country.cars?.driving_side ?? "—"}`);
  lines.push(`Vehicle Signs: ${formatVehicleSigns(country)}`);
  lines.push(`Number Format: ${formatNumberFormat(country)}`);
  lines.push(`Top-Level Domain: ${country.tlds?.join(", ") || "—"}`);
  lines.push(`Timezones: ${country.timezones?.join(", ") || "—"}`);

  const borders = country.borders ?? [];
  if (borders.length) lines.push(`Borders: ${borders.map((code) => namesByCode?.get(code) ?? code).join(", ")}`);

  const memberships = formatMemberships(country);
  if (memberships.length) lines.push(`Memberships: ${memberships.join(", ")}`);

  if (country.links?.official) lines.push(`Official Website: ${country.links.official}`);
  if (country.links?.wikipedia) lines.push(`Wikipedia: ${country.links.wikipedia}`);
  if (country.links?.google_maps) lines.push(`Google Maps: ${country.links.google_maps}`);

  return lines.join("\n");
}
