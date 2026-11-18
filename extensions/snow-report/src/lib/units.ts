import { getPreferenceValues } from "@raycast/api";

// All inputs are metric (cm, °C, m, km/h); conversion happens only for display.
const imperial = () => getPreferenceValues<Preferences>().units === "imperial";
const MISSING = "–";

// One decimal below 10 ("2.5 cm"), whole numbers above ("15 cm").
function amount(value: number): string {
  return value < 10 ? String(Math.round(value * 10) / 10) : String(Math.round(value));
}

export function formatSnow(cm: number | null | undefined): string {
  if (cm === null || cm === undefined) return MISSING;
  return imperial() ? `${amount(cm / 2.54)} in` : `${amount(cm)} cm`;
}

export function formatRain(mm: number | null | undefined): string {
  if (mm === null || mm === undefined) return MISSING;
  return imperial() ? `${amount(mm / 25.4)} in` : `${amount(mm)} mm`;
}

export function formatTemp(celsius: number | null | undefined): string {
  if (celsius === null || celsius === undefined) return MISSING;
  return imperial() ? `${Math.round((celsius * 9) / 5 + 32)}°F` : `${Math.round(celsius)}°C`;
}

export function formatElevation(metres: number | null | undefined): string {
  if (metres === null || metres === undefined) return MISSING;
  const value = imperial() ? metres * 3.28084 : metres;
  return `${Math.round(value).toLocaleString("en-US")} ${imperial() ? "ft" : "m"}`;
}

/** "10, gusts 25 km/h": the unit once, so it fits beside a label. */
export function formatWindAndGusts(kmh: number | null, gustsKmh: number | null): string {
  const number = (v: number | null) => (v === null ? MISSING : String(Math.round(imperial() ? v / 1.609344 : v)));
  return `${number(kmh)}, gusts ${formatWind(gustsKmh)}`;
}

export function formatWind(kmh: number | null | undefined): string {
  if (kmh === null || kmh === undefined) return MISSING;
  return imperial() ? `${Math.round(kmh / 1.609344)} mph` : `${Math.round(kmh)} km/h`;
}

// Form input uses the preferred unit; storage is always metres.
export const elevationUnit = () => (imperial() ? "ft" : "m");
export const toDisplayElevation = (metres: number) => Math.round(imperial() ? metres * 3.28084 : metres);
export const fromDisplayElevation = (value: number) => Math.round(imperial() ? value / 3.28084 : value);

// Bare numbers for charts, where the unit appears once in the title.
export const snowUnit = () => (imperial() ? "in" : "cm");
export const snowNumber = (cm: number) => amount(imperial() ? cm / 2.54 : cm);
export const formatTempShort = (celsius: number | null | undefined) => formatTemp(celsius).replace(/°[CF]$/, "°");
