import { getPreferenceValues, type Tool } from "@raycast/api";
import { resolveAiSky, type SkyInput } from "../lib/ai-sky";
import { countryName } from "../lib/locations";
import { applyWallpaper } from "../lib/wallpaper";

export const confirmation: Tool.Confirmation<SkyInput> = async (input) => {
  const { city, local } = await resolveAiSky(input);
  return {
    message: "Set this sky as your desktop wallpaper?",
    info: [
      { name: "City", value: `${city.name}, ${countryName(city)}` },
      { name: "Local Time", value: local?.replace("T", " · ") ?? "Now" },
      { name: "Wallpaper", value: process.platform === "win32" ? "Desktop-wide" : "Primary display" },
      ...(getPreferenceValues<Preferences>().saveImages
        ? [{ name: "PNG Copy", value: "Saved to your wallpaper directory" }]
        : []),
    ],
  };
};

/** Change the desktop wallpaper once with the user's confirmation. */
export default async function tool(input: SkyInput) {
  const sky = await resolveAiSky(input);
  const result = await applyWallpaper(sky);
  return {
    applied: true,
    city: sky.city.name,
    country: countryName(sky.city),
    time: sky.local ?? "Now",
    message: result.title,
    ...(result.warning && { warning: result.warning }),
  };
}
