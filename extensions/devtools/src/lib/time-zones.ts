export const DEFAULT_TIME_ZONES = ["Asia/Shanghai", "UTC", "America/Los_Angeles"];

const supportedTimeZones = Intl.supportedValuesOf("timeZone");
const cityNames: Record<string, string> = {
  "Asia/Shanghai": "Shanghai / Beijing",
  "Asia/Hong_Kong": "Hong Kong",
  "Asia/Tokyo": "Tokyo",
  "Asia/Singapore": "Singapore",
  "Asia/Seoul": "Seoul",
  "Asia/Kolkata": "India",
  "Asia/Calcutta": "India",
  "Europe/London": "London",
  "Europe/Berlin": "Berlin",
  "Europe/Paris": "Paris",
  "America/Los_Angeles": "Los Angeles",
  "America/New_York": "New York",
  "Australia/Sydney": "Sydney",
};

export function isTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || !value) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

export function readSavedTimeZones(input: string): string[] | undefined {
  try {
    const values: unknown = JSON.parse(input);
    if (!Array.isArray(values) || !values.every(isTimeZone)) return undefined;
    return [...new Set(values as string[])];
  } catch {
    return undefined;
  }
}

export function timeZoneOptions(selected: string[]): string[] {
  return [...new Set([...DEFAULT_TIME_ZONES, ...selected, ...supportedTimeZones])];
}

export function timeZoneTitle(zone: string): string {
  return cityNames[zone] ? `${cityNames[zone]} · ${zone}` : zone;
}
