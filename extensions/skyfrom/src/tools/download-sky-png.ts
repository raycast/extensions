import type { Tool } from "@raycast/api";
import { resolveAiSky, type SkyInput } from "../lib/ai-sky";
import { countryName } from "../lib/locations";
import { getSky } from "../lib/skyfrom-api";
import { downloadWallpaper, wallpaperDownloadDirectory } from "../lib/wallpaper";

export const confirmation: Tool.Confirmation<SkyInput> = async (input) => {
  const { city, local } = await resolveAiSky(input);
  return {
    message: "Save this sky as a PNG?",
    info: [
      { name: "City", value: `${city.name}, ${countryName(city)}` },
      { name: "Local Time", value: local?.replace("T", " · ") ?? "Now" },
      { name: "Save to", value: wallpaperDownloadDirectory() },
    ],
  };
};

/** Save a display-sized SkyFrom PNG in the wallpaper directory after confirmation. */
export default async function tool(input: SkyInput) {
  const sky = await resolveAiSky(input);
  const { value, stale } = await getSky(sky);
  const path = await downloadWallpaper({ city: sky.city, local: value.local });
  return { path, city: sky.city.name, country: countryName(sky.city), time: value.local, cached: stale };
}
