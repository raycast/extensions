import { Cache, getPreferenceValues } from "@raycast/api";
import { getProfileCountry, resolveOwnSteamId } from "./users";

const DAY = 24 * 60 * 60 * 1000;
const cache = new Cache({ namespace: "store-country" });

function systemRegion() {
  try {
    return new Intl.Locale(Intl.DateTimeFormat().resolvedOptions().locale).region;
  } catch {
    return undefined;
  }
}

// Steam caches store responses publicly for an hour without varying by location, so a request with no
// country can come back priced for someone else; every store request names one instead
export async function storeCountry(): Promise<string> {
  const { token, steamid } = getPreferenceValues<Preferences>();
  const key = token?.trim();
  const id = steamid?.trim();
  if (key && id) {
    const cached = cache.get(id);
    const parsed = cached ? (JSON.parse(cached) as { country: string; fetchedAt: number }) : undefined;
    if (parsed && Date.now() - parsed.fetchedAt < DAY) {
      if (parsed.country) return parsed.country;
    } else {
      const country = await resolveOwnSteamId(id, key)
        .then((steamId) => getProfileCountry(steamId, key))
        .catch(() => undefined);
      cache.set(id, JSON.stringify({ country: country ?? "", fetchedAt: Date.now() }));
      if (country) return country;
    }
  }
  return systemRegion() ?? "US";
}
