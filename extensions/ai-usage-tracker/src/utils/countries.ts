import type { Lang } from "../i18n/translations";

export interface Country {
  code: string;
  names: Record<Lang, string>;
}

export const SUPPORTED_COUNTRIES: Country[] = [
  { code: "AT", names: { en: "Austria", fr: "Autriche" } },
  { code: "BE", names: { en: "Belgium", fr: "Belgique" } },
  { code: "CA", names: { en: "Canada", fr: "Canada" } },
  { code: "CH", names: { en: "Switzerland", fr: "Suisse" } },
  { code: "DE", names: { en: "Germany", fr: "Allemagne" } },
  { code: "DK", names: { en: "Denmark", fr: "Danemark" } },
  { code: "ES", names: { en: "Spain", fr: "Espagne" } },
  { code: "FI", names: { en: "Finland", fr: "Finlande" } },
  { code: "FR", names: { en: "France", fr: "France" } },
  { code: "GB", names: { en: "United Kingdom", fr: "Royaume-Uni" } },
  { code: "IE", names: { en: "Ireland", fr: "Irlande" } },
  { code: "IT", names: { en: "Italy", fr: "Italie" } },
  { code: "LU", names: { en: "Luxembourg", fr: "Luxembourg" } },
  { code: "NL", names: { en: "Netherlands", fr: "Pays-Bas" } },
  { code: "NO", names: { en: "Norway", fr: "Norvège" } },
  { code: "PL", names: { en: "Poland", fr: "Pologne" } },
  { code: "PT", names: { en: "Portugal", fr: "Portugal" } },
  { code: "SE", names: { en: "Sweden", fr: "Suède" } },
  { code: "US", names: { en: "United States", fr: "États-Unis" } },
];

export function getCountryName(code: string, lang: Lang): string {
  const country = SUPPORTED_COUNTRIES.find((c) => c.code === code);
  return country ? country.names[lang] : code;
}

export async function fetchPublicHolidays(year: number, countryCode: string): Promise<string[]> {
  const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as Array<{ date: string }>;
  return data.map((h) => h.date);
}
