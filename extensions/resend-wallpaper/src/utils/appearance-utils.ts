import type { AppearancedWallpaper } from "../types/types";
import { cache } from "./common-utils";
import { CacheKey } from "./constants";

const WallpaperAppearance: AppearancedWallpaper[] = [
  {
    title: "Modulos 1",
    appearance: "dark",
  },
  {
    title: "Modulos 2",
    appearance: "dark",
  },
  {
    title: "Modulos 3",
    appearance: "dark",
  },
  {
    title: "Discus 1",
    appearance: "dark",
  },
  {
    title: "Discus 2",
    appearance: "dark",
  },
  {
    title: "Discus 3",
    appearance: "dark",
  },
  {
    title: "Cylindrus 1",
    appearance: "dark",
  },
  {
    title: "Cylindrus 2",
    appearance: "dark",
  },
  {
    title: "Cylindrus 3",
    appearance: "dark",
  },
  {
    title: "Sphaera 1",
    appearance: "dark",
  },
  {
    title: "Sphaera 2",
    appearance: "dark",
  },
  {
    title: "Sphaera 3",
    appearance: "dark",
  },
  {
    title: "Cista 1",
    appearance: "dark",
  },
  {
    title: "Cista 2",
    appearance: "dark",
  },
  {
    title: "Cista 3",
    appearance: "dark",
  },
  {
    title: "Cubus 1",
    appearance: "dark",
  },
  {
    title: "Cubus 2",
    appearance: "dark",
  },
  {
    title: "Cubus 3",
    appearance: "dark",
  },
  {
    title: "Pipulae 1",
    appearance: "dark",
  },
  {
    title: "Pipulae 2",
    appearance: "dark",
  },
  {
    title: "Pipulae 3",
    appearance: "dark",
  },
  {
    title: "Scalae 1",
    appearance: "dark",
  },
  {
    title: "Scalae 2",
    appearance: "dark",
  },
  {
    title: "Scalae 3",
    appearance: "dark",
  },
];

const getWallpaperAppearance = () => {
  const customAppearance = cache.get(CacheKey.WALLPAPER_APPEARANCE);
  const customWallpaperAppearance: AppearancedWallpaper[] = customAppearance
    ? (() => {
        try {
          return JSON.parse(customAppearance);
        } catch {
          return [];
        }
      })()
    : [];

  if (customWallpaperAppearance.length === 0) {
    return WallpaperAppearance;
  }

  return WallpaperAppearance.map((item) => {
    const customItem = customWallpaperAppearance.find((custom) => custom.title === item.title);
    return customItem ? { ...item, appearance: customItem.appearance } : item;
  });
};

export const getAppearanceByTitle = (value: string): "light" | "dark" => {
  const appearanceList = getWallpaperAppearance();
  const wallpaper = appearanceList.find((item) => item.title === value);
  return wallpaper ? wallpaper.appearance : "light";
};
