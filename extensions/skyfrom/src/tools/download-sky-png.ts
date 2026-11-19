import { resolveAiSky, type SkyInput } from "../lib/ai-sky";
import { countryName } from "../lib/locations";
import { getSky } from "../lib/skyfrom-api";
import { downloadWallpaper } from "../lib/wallpaper";

/** Save a display-sized SkyFrom PNG in the configured wallpaper directory or Downloads. */
export default async function tool(input: SkyInput) {
  const sky = await resolveAiSky(input);
  const { value, stale } = await getSky(sky);
  const path = await downloadWallpaper({ city: sky.city, local: value.local });
  return { path, city: sky.city.name, country: countryName(sky.city), time: value.local, cached: stale };
}
