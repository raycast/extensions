const NAGER_BASE = "https://date.nager.at/api/v3";

export type Holiday = {
  date: Date;
  name: string;
  country?: {
    name: string;
    emoji: string;
  };
};

type NagerPublicHoliday = {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  counties: string | null;
  launchYear: number | null;
  types: string[];
};

type NagerCountry = {
  countryCode: string;
  name: string;
};

/** Emoji flag from ISO 3166-1 alpha-2 country code (regional indicator symbols). */
function getFlagEmoji(countryCode: string): string {
  if (countryCode.length !== 2) return "";
  return [...countryCode].map((c) => String.fromCodePoint(0x1f1e6 - 65 + c.toUpperCase().charCodeAt(0))).join("");
}

/** Supported countries with holiday data (Nager.Date AvailableCountries). */
export type SupportedCountry = {
  name: string;
  alpha2: string;
  emoji: string;
};

export async function getAvailableCountries(): Promise<SupportedCountry[]> {
  const response = await fetch(`${NAGER_BASE}/AvailableCountries`);
  if (!response.ok) {
    throw new Error(`Failed to fetch countries: ${response.status} ${response.statusText}`);
  }
  const data = (await response.json()) as NagerCountry[];
  return data.map((c) => ({
    name: c.name,
    alpha2: c.countryCode,
    emoji: getFlagEmoji(c.countryCode),
  }));
}

export const getHolidays = async (countryCode: string): Promise<Holiday[]> => {
  const year = new Date().getFullYear();
  const years = [year, year + 1];

  const results = await Promise.all(
    years.map(async (y) => {
      const response = await fetch(`${NAGER_BASE}/PublicHolidays/${y}/${countryCode}`);
      if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error(`Failed to fetch holidays: ${response.status} ${response.statusText}`);
      }
      return (await response.json()) as NagerPublicHoliday[];
    }),
  );

  const merged = results.flat();
  const byDate = new Map<string, NagerPublicHoliday>();
  for (const h of merged) {
    byDate.set(h.date, h);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, h]) => ({
      date: new Date(h.date),
      name: h.name,
    }));
};
