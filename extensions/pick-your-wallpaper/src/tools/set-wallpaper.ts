import { Tool, getPreferenceValues } from "@raycast/api";
import path from "path";
import { Preferences } from "../types/preferences";
import { getWallpaperFiles, applyWallpaperUpdate } from "../utils";

type Input = {
  /**
   * The filename of the wallpaper to set (with extension).
   * Must match a file in the user's wallpaper folder.
   * @example "sunset-mountains.jpg"
   */
  filename: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const preferences = getPreferenceValues<Preferences>();
  const files = await getWallpaperFiles(preferences.wallpaperFolder);
  const needle = input.filename.toLowerCase().replace(/\.(jpg|jpeg|png|gif|heic)$/i, "");
  const match =
    files.find((f) => f.name.toLowerCase() === input.filename.toLowerCase()) ??
    files.find((f) => path.basename(f.name, path.extname(f.name)).toLowerCase() === needle) ??
    files.find((f) => f.name.toLowerCase().includes(needle)) ??
    files.find((f) => path.basename(f.name, path.extname(f.name)).toLowerCase().includes(needle));

  const displayName = match
    ? path.basename(match.name, path.extname(match.name)).replace(/[-_]/g, " ")
    : path.basename(input.filename, path.extname(input.filename)).replace(/[-_]/g, " ");

  return {
    message: `Set "${displayName}" as your desktop wallpaper?`,
    info: [{ name: "File", value: match?.name ?? input.filename }],
    image: match ? { fileIcon: match.path } : undefined,
  };
};

/**
 * Set a wallpaper from the user's collection as the desktop background on all desktops.
 */
export default async function setWallpaper(input: Input) {
  const preferences = getPreferenceValues<Preferences>();
  const files = await getWallpaperFiles(preferences.wallpaperFolder);

  const needle = input.filename.toLowerCase().replace(/\.(jpg|jpeg|png|gif|heic)$/i, "");
  const match =
    files.find((f) => f.name.toLowerCase() === input.filename.toLowerCase()) ??
    files.find((f) => path.basename(f.name, path.extname(f.name)).toLowerCase() === needle) ??
    files.find((f) => f.name.toLowerCase().includes(needle)) ??
    files.find((f) => path.basename(f.name, path.extname(f.name)).toLowerCase().includes(needle));

  if (!match) {
    return { success: false, message: `Wallpaper "${input.filename}" not found in your collection.` };
  }

  await applyWallpaperUpdate(match.path);

  return {
    success: true,
    filename: match.name,
    displayName: path.basename(match.name, path.extname(match.name)).replace(/[-_]/g, " "),
    message: `Wallpaper set to "${path.basename(match.name, path.extname(match.name)).replace(/[-_]/g, " ")}".`,
  };
}
