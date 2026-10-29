import { getPreferenceValues } from "@raycast/api";
import axios from "axios";
import type { ResendWallpaper } from "../types/types";
import { setWallpaper } from "../utils/applescript-utils";
import { RESEND_WALLPAPER_LIST_URL } from "../utils/constants";

type Input = {
  /** Exact wallpaper name returned by Get Resend Wallpapers. */
  title: string;
};

/** Set a Resend wallpaper on the monitors selected in this tool's preferences. */
export default async function setResendWallpaper(input: Input) {
  const { applyTo } = getPreferenceValues<{ applyTo: "current" | "every" }>();
  const response = await axios.get<ResendWallpaper[]>(RESEND_WALLPAPER_LIST_URL);
  const wallpaper = response.data.find((item) => item.title.toLowerCase() === input.title.toLowerCase());
  if (!wallpaper) {
    return `No Resend wallpaper named "${input.title}" was found. Get the current wallpaper list to choose a name.`;
  }

  const success = await setWallpaper(wallpaper, applyTo);
  return success
    ? `Set "${wallpaper.title}" as the desktop wallpaper.`
    : `Could not set "${wallpaper.title}" as the desktop wallpaper.`;
}
