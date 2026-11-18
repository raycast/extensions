import { readWallpaperHistory } from "../history-store";
import { setDesktopWallpaper } from "../utils";

type Input = {
  /** Exact wallpaper.id returned by get-wallpaper-history or search-wallpaper-history. */
  wallpaperId: string;
};

export default async function tool(input: Input) {
  const entry = (await readWallpaperHistory()).find(
    (item) => item.wallpaper.id === input.wallpaperId,
  );
  if (!entry)
    throw new Error(
      "Wallpaper not found in history. Search history for an existing artwork first.",
    );
  await setDesktopWallpaper(entry.wallpaper);
  return { status: "selected", wallpaper: entry.wallpaper };
}
