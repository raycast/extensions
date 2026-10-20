import { applyWallpaper } from "../utils/platform-utils";
import listWallpapers from "./list-wallpapers";

type Input = {
  /** The exact wallpaper title returned by list-wallpapers. */
  title: string;
  /** Apply to the current monitor or every monitor. Defaults to every. */
  applyTo?: "current" | "every";
};

/** Set an official Raycast wallpaper. Throws if the title is unavailable or setting the wallpaper fails. */
export default async function setWallpaper({ title, applyTo = "every" }: Input) {
  const wallpapers = await listWallpapers();
  const wallpaper = wallpapers.find((item) => item.title === title);
  if (!wallpaper) {
    throw new Error(`Wallpaper "${title}" was not found. Use list-wallpapers to find an available title.`);
  }

  await applyWallpaper(wallpaper, applyTo);
  return { title: wallpaper.title, applyTo };
}
