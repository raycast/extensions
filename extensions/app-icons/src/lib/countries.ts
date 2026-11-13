export interface StoreCountry {
  code: string;
  name: string;
}

export const STORE_COUNTRIES: readonly StoreCountry[] = [
  { code: "US", name: "United States" },
  { code: "CN", name: "China" },
  { code: "HK", name: "Hong Kong" },
  { code: "TW", name: "Taiwan" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "Korea" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "SG", name: "Singapore" },
  { code: "IN", name: "India" },
  { code: "BR", name: "Brazil" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "MX", name: "Mexico" },
  { code: "NL", name: "Netherlands" },
  { code: "SE", name: "Sweden" },
  { code: "TR", name: "Turkey" },
];

export const DEFAULT_STORE_COUNTRY = "US";

const ALLOWED = new Set(STORE_COUNTRIES.map((country) => country.code));

export function normalizeCountry(value: string | null | undefined): string {
  const code = value?.trim().toUpperCase() ?? "";
  return ALLOWED.has(code) ? code : DEFAULT_STORE_COUNTRY;
}
