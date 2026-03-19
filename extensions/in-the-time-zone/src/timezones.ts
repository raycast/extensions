import { lookupCity, parseCityId } from "./citySearch";

export type TimeZoneEntry = { id: string; label: string };

// IDs use format: "timezone|cityName" (e.g., "America/Los_Angeles|San Francisco")
export const DEFAULT_TIME_ZONES: TimeZoneEntry[] = [
  { id: "America/Los_Angeles|San Francisco", label: "San Francisco (PT)" },
  { id: "America/New_York|New York", label: "New York (ET)" },
  { id: "Europe/London|London", label: "London (UK)" },
  { id: "Europe/Paris|Paris", label: "Paris (CET)" },
  { id: "Asia/Kuala_Lumpur|Kuala Lumpur", label: "Kuala Lumpur (MYT)" },
  { id: "Asia/Tokyo|Tokyo", label: "Tokyo (JST)" },
];

export function getTimezone(id: string): string {
  return parseCityId(id).timezone;
}

export function getCityName(id: string): string {
  const city = lookupCity(id);
  if (city) {
    return city.city;
  }
  // Fallback: use the city name from the ID
  return parseCityId(id).cityName;
}
