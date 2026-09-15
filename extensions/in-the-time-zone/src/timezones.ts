import { DateTime } from "luxon";
import { lookupCity, parseCityId } from "./citySearch";

export type TimeZoneEntry = { id: string; label: string };

export type CityOrderPreference = "offset-asc" | "offset-desc" | "custom";

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

export function sortZoneIds(zoneIds: string[], baseISO: string, order: CityOrderPreference): string[] {
  if (order === "custom") return zoneIds;
  const direction = order === "offset-desc" ? -1 : 1;
  // Resolve offsets at the scrubbed time so DST transitions are respected
  return [...zoneIds].sort((a, b) => {
    const offsetA = DateTime.fromISO(baseISO).setZone(getTimezone(a)).offset;
    const offsetB = DateTime.fromISO(baseISO).setZone(getTimezone(b)).offset;
    if (offsetA !== offsetB) return (offsetA - offsetB) * direction;
    return getCityName(a).localeCompare(getCityName(b));
  });
}

export function getCityName(id: string): string {
  const city = lookupCity(id);
  if (city) {
    return city.city;
  }
  // Fallback: use the city name from the ID
  return parseCityId(id).cityName;
}
