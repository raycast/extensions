import { getDefaultSelection, readLocations } from "./locations";
import type { SkyRequest } from "./skyfrom-api";
import { isDate, isLocalTime, localMinute, now, type Preset, presets, resolveTime, type SkyTime } from "./time";

export type SkyInput = {
  /** City name with country when ambiguous, or an exact slug from search-cities. Omit to use the saved default. */
  city?: string;
  /** Exact ID from list-favorite-skies. Use on its own to keep the favorite's city and time. */
  favoriteId?: string;
  /** Destination-local YYYY-MM-DDTHH:MM, or HH:MM for today in the destination. Use a 24-hour clock with no offset. */
  localTime?: string;
  /** A destination-local preset. Use now for the current sky. Omit when providing localTime. */
  preset?: Preset | "now";
  /** YYYY-MM-DD in the destination. Use with a preset other than now. Omit for today in that city. */
  date?: string;
};

export async function resolveAiSky(input: SkyInput): Promise<SkyRequest> {
  const { preset } = input;
  const city = input.city?.trim();
  const favoriteId = input.favoriteId?.trim();
  const localTime = input.localTime?.trim();
  const date = input.date?.trim();

  if (favoriteId) {
    if (city || localTime || preset || date)
      throw new Error("Use a favorite by itself to keep its saved city and time.");
    const { favorites } = await readLocations();
    const favorite = favorites.find(({ id }) => id === favoriteId);
    if (!favorite) throw new Error("That favorite is no longer available. List your favorite skies to choose one.");
    return { city: favorite.city, local: resolveTime(favorite.time, favorite.city) };
  }

  if (preset && preset !== "now" && !presets.includes(preset)) throw new Error("Choose a supported sky time preset.");
  if (localTime && preset) throw new Error("Choose either a local time or a preset.");
  if (date && (!preset || preset === "now" || !isDate(date))) {
    throw new Error("Use a date in YYYY-MM-DD with Sunrise, Noon, Sunset, Midnight, or Golden Hour.");
  }

  const selection = await getDefaultSelection({ override: city });
  if (!selection) throw new Error("Specify a city or choose a default city in Explore Sky.");

  let time: SkyTime = selection.time;
  if (localTime) {
    const day = localMinute(new Date(), selection.city.tz).slice(0, 10);
    const local = localTime.includes("T") ? localTime : `${day}T${localTime}`;
    if (!isLocalTime(local)) throw new Error("Enter the destination’s local time as HH:MM or YYYY-MM-DDTHH:MM.");
    time = { kind: "fixed", local };
  } else if (preset) {
    time = preset === "now" ? now : { kind: "preset", event: preset, date };
  }
  return { city: selection.city, local: resolveTime(time, selection.city) };
}
