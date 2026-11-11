// Wsymb2 weather-symbol codes (1..27) as documented by SMHI.
// https://opendata.smhi.se/metfcst/snow1gv1/parameters
//
// Each code maps to an emoji rather than a built-in Raycast Icon: the built-in set can't tell
// sleet from snow (both would be Icon.CloudSnow) and has no fog glyph at all, so the emoji is
// both more precise and more legible at list-row size.

interface WsymbEntry {
  label: string;
  emoji: string;
}

const FALLBACK = { label: "Unknown", emoji: "❔" } as const satisfies WsymbEntry;

export const WSYMB2 = {
  1: { label: "Clear sky", emoji: "☀️" },
  2: { label: "Nearly clear", emoji: "🌤️" },
  3: { label: "Variable cloudiness", emoji: "⛅" },
  4: { label: "Halfclear", emoji: "⛅" },
  5: { label: "Cloudy", emoji: "☁️" },
  6: { label: "Overcast", emoji: "☁️" },
  7: { label: "Fog", emoji: "🌫️" },
  8: { label: "Light rain showers", emoji: "🌦️" },
  9: { label: "Moderate rain showers", emoji: "🌦️" },
  10: { label: "Heavy rain showers", emoji: "🌧️" },
  11: { label: "Thunderstorm", emoji: "⛈️" },
  12: { label: "Light sleet showers", emoji: "🌨️" },
  13: { label: "Moderate sleet showers", emoji: "🌨️" },
  14: { label: "Heavy sleet showers", emoji: "🌨️" },
  15: { label: "Light snow showers", emoji: "🌨️" },
  16: { label: "Moderate snow showers", emoji: "🌨️" },
  17: { label: "Heavy snow showers", emoji: "❄️" },
  18: { label: "Light rain", emoji: "🌧️" },
  19: { label: "Moderate rain", emoji: "🌧️" },
  20: { label: "Heavy rain", emoji: "🌧️" },
  21: { label: "Thunder", emoji: "⛈️" },
  22: { label: "Light sleet", emoji: "🌨️" },
  23: { label: "Moderate sleet", emoji: "🌨️" },
  24: { label: "Heavy sleet", emoji: "🌨️" },
  25: { label: "Light snowfall", emoji: "🌨️" },
  26: { label: "Moderate snowfall", emoji: "❄️" },
  27: { label: "Heavy snowfall", emoji: "❄️" },
} as const satisfies Record<number, WsymbEntry>;

export function symbolFor(code: number): WsymbEntry {
  return (WSYMB2 as Record<number, WsymbEntry>)[code] ?? FALLBACK;
}

// `predominant_precipitation_type_at_surface` codes (SMHI enum, 0..6).
const PRECIP_TYPE = {
  0: "None",
  1: "Snow",
  2: "Snow and rain",
  3: "Rain",
  4: "Drizzle",
  5: "Freezing rain",
  6: "Freezing drizzle",
} as const satisfies Record<number, string>;

export function precipTypeLabel(code: number): string {
  return (PRECIP_TYPE as Record<number, string>)[code] ?? "Unknown";
}
