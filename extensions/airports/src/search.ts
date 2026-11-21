export interface Airport {
  id: string;
  iata: string;
  icao: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
  type: string;
  keywords: string;
}

export interface AirportIndexEntry {
  airport: Airport;
  iata: string;
  icao: string;
  name: string;
  city: string;
  text: string;
  priority: number;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function createAirportIndex(airports: Airport[]): AirportIndexEntry[] {
  return airports.map((airport) => ({
    airport,
    iata: normalize(airport.iata),
    icao: normalize(airport.icao),
    name: normalize(airport.name),
    city: normalize(airport.city),
    priority: airport.type === "large_airport" ? 0 : airport.type === "medium_airport" ? 1 : 2,
    text: normalize(
      [
        airport.iata,
        airport.icao,
        airport.name,
        airport.city,
        airport.country,
        airport.countryCode,
        airport.keywords,
      ].join(" "),
    ),
  }));
}

export function searchAirports(index: AirportIndexEntry[], query: string): Airport[] {
  const normalized = normalize(query);
  if (!normalized) return index.map(({ airport }) => airport);

  const tokens = normalized.split(" ");
  return index
    .filter(({ text }) => tokens.every((token) => text.includes(token)))
    .map((entry) => ({ entry, rank: rank(entry, normalized) }))
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        a.entry.priority - b.entry.priority ||
        a.entry.airport.iata.localeCompare(b.entry.airport.iata),
    )
    .map(({ entry }) => entry.airport);
}

function rank(entry: AirportIndexEntry, query: string): number {
  if (entry.iata === query) return 0;
  if (entry.iata.startsWith(query)) return 1;
  if (entry.icao === query) return 2;
  if (entry.name.startsWith(query)) return 3;
  if (entry.city === query) return 4;
  if (entry.name.includes(query)) return 5;
  return 6;
}
