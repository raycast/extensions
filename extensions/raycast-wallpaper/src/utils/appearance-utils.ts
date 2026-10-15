import { AppearancedWallpaper } from "../types/types";
import { cache } from "./common-utils";
import { CacheKey } from "./constants";

const WallpaperAppearance: AppearancedWallpaper[] = [
  {
    title: "red_distortion_1",
    appearance: "dark",
  },
  {
    title: "red_distortion_2",
    appearance: "dark",
  },
  {
    title: "red_distortion_3",
    appearance: "dark",
  },
  {
    title: "red_distortion_4",
    appearance: "dark",
  },
  {
    title: "blue_distortion_1",
    appearance: "dark",
  },
  {
    title: "blue_distortion_2",
    appearance: "dark",
  },
  {
    title: "mono_dark_distortion_1",
    appearance: "dark",
  },
  {
    title: "mono_dark_distortion_2",
    appearance: "dark",
  },
  {
    title: "mono_light_distortion_1",
    appearance: "light",
  },
  {
    title: "mono_light_distortion_2",
    appearance: "light",
  },
  {
    title: "chromatic_dark_1",
    appearance: "dark",
  },
  {
    title: "chromatic_dark_2",
    appearance: "dark",
  },
  {
    title: "chromatic_light_1",
    appearance: "light",
  },
  {
    title: "chromatic_light_2",
    appearance: "light",
  },
  {
    title: "cube",
    appearance: "dark",
  },
  {
    title: "cube_mono",
    appearance: "dark",
  },
  {
    title: "Loupe",
    appearance: "dark",
  },
  {
    title: "Loupe Mono Dark",
    appearance: "dark",
  },
  {
    title: "Loupe Mono Light",
    appearance: "light",
  },
  {
    title: "Blob",
    appearance: "dark",
  },
  {
    title: "Blob Red",
    appearance: "dark",
  },
  {
    title: "Raycast Logo",
    appearance: "dark",
  },
  {
    title: "Autumnal Peach",
    appearance: "light",
  },
  {
    title: "Blossom",
    appearance: "light",
  },
  {
    title: "Blushing Fire",
    appearance: "light",
  },
  {
    title: "Bright Rain",
    appearance: "dark",
  },
  {
    title: "Floss",
    appearance: "light",
  },
  {
    title: "Glass Rainbow",
    appearance: "light",
  },
  {
    title: "Good Vibes",
    appearance: "light",
  },
  {
    title: "Moonrise",
    appearance: "dark",
  },
  {
    title: "Ray of Lights",
    appearance: "dark",
  },
  {
    title: "Rose Thorn",
    appearance: "dark",
  },
];

const normalizeTitle = (title: string) => title.toLowerCase().replace(/_/g, " ");

export const getAppearanceByTitle = (value: string): "light" | "dark" => {
  const customAppearance = cache.get(CacheKey.WALLPAPER_APPEARANCE);
  const customWallpapers: AppearancedWallpaper[] = customAppearance ? JSON.parse(customAppearance) : [];
  const title = normalizeTitle(value);
  const custom = customWallpapers.find((item) => normalizeTitle(item.title) === title);
  const wallpaper = custom ?? WallpaperAppearance.find((item) => normalizeTitle(item.title) === title);
  return wallpaper?.appearance ?? "light";
};
