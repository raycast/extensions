import { format, toZonedTime } from "date-fns-tz";
import { updateCommandMetadata, LocalStorage, getPreferenceValues } from "@raycast/api";
import { LocationEntry, TimeEntry, TimeGroup } from "./types";

/** Convert a two-letter ISO code like "DE" into a flag emoji */
export function getFlagEmoji(isoCode: string): string {
  return isoCode.toUpperCase().replace(/./g, (char) => String.fromCodePoint(char.charCodeAt(0) + 127397));
}

export function formatLocalTime(timeZone: string): string {
  const { timeFormat } = getPreferenceValues<ExtensionPreferences>();
  const now = new Date();
  const localDate = toZonedTime(now, timeZone);

  if (timeFormat === "24h") {
    return format(localDate, "HH:mm"); // 24-hour
  } else {
    return format(localDate, "hh:mm a"); // 12-hour with AM/PM
  }
}

/**
 * Return an array of TimeGroups, each representing a set of cities that
 * share the same local time *at this moment*. The "signature" is a stable
 * key that won't change minute-by-minute, even though "time" will.
 */
export async function computeTimeGroups(): Promise<TimeGroup[]> {
  const raw = await LocalStorage.getItem<string>("team_time_cities");
  let savedCities: TimeEntry[] = [];
  try {
    savedCities = raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to parse saved cities:", e);
  }

  // Step 1: Group by ephemeral localTime
  const ephemeralGroups: Record<string, TimeEntry[]> = {};
  for (const city of savedCities) {
    const localTime = formatLocalTime(city.timeZone);
    if (!ephemeralGroups[localTime]) {
      ephemeralGroups[localTime] = [];
    }
    ephemeralGroups[localTime].push(city);
  }

  // Step 2: For each ephemeral group, compute a stable signature
  // by sorting the timeZones and converting to JSON.
  //
  // That means if the same set of time zones appear together again
  // tomorrow (still showing the same local time), they'll get the same signature.
  // So the user's custom flag won't be lost.
  const stableGroups: Record<string, { time: string; cityNames: string[]; isoCodes: string[] }> = {};

  for (const [time, cities] of Object.entries(ephemeralGroups)) {
    // Sort the time zones to produce a stable array
    const sortedZones = cities.map((c) => c.timeZone).sort((a, b) => a.localeCompare(b));
    const signature = JSON.stringify(sortedZones);

    // If we haven't created an entry for this signature, create it
    if (!stableGroups[signature]) {
      stableGroups[signature] = {
        time, // ephemeral time for display
        cityNames: [],
        isoCodes: [],
      };
    }

    // Accumulate city names and ISO codes
    for (const c of cities) {
      stableGroups[signature].cityNames.push(c.city);
      stableGroups[signature].isoCodes.push(c.isoCode);
    }
  }

  // Step 3: Convert stableGroups into an array
  return Object.entries(stableGroups).map(([signature, data]) => {
    // Remove duplicates from cityNames
    const uniqueCityNames = Array.from(new Set(data.cityNames));
    // Combine flags
    const combinedFlags = Array.from(new Set(data.isoCodes.map(getFlagEmoji))).join(" ");

    return {
      signature, // stable key
      time: data.time, // ephemeral local time
      cities: uniqueCityNames,
      combinedFlags,
    };
  });
}

/**
 * Update the command metadata to display the combined flags and ephemeral time.
 */
export async function updateTeamTimeLabel() {
  const mappingRaw = await LocalStorage.getItem<string>("team_time_custom_mapping");
  let customMapping: Record<string, string> = {};

  try {
    customMapping = mappingRaw ? JSON.parse(mappingRaw) : {};
  } catch (e) {
    console.error("Failed to parse custom mapping:", e);
  }

  const groups = await computeTimeGroups();

  // For each group, use the stable signature to retrieve the user's custom flag.
  const subtitleParts = groups.map((group) => {
    const customFlagOrDefault = customMapping[group.signature] ?? group.combinedFlags;
    return `${customFlagOrDefault} ${group.time}`;
  });

  const subtitle = subtitleParts.join("  ");
  try {
    await updateCommandMetadata({ subtitle });
  } catch (e) {
    console.error("Failed to update command metadata:", e);
  }
}

export const formatLocation = (entry: LocationEntry) => {
  const parts = [entry.city];
  if ("state" in entry && entry.state) parts.push(entry.state);
  parts.push(entry.country);
  return parts.join(", ");
};
