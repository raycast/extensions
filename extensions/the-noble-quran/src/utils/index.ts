import { LocalStorage } from "@raycast/api";
import { FavoriteAyah, Surah } from "../types";

export const addAyahToFavorites = async (ayah: FavoriteAyah) =>
  await LocalStorage.setItem(
    "favorites",
    JSON.stringify([...JSON.parse((await LocalStorage.getItem("favorites")) || "[]"), ayah])
  );

export const removeAyahFromFavorites = async (ayah: FavoriteAyah) =>
  await LocalStorage.setItem(
    "favorites",
    JSON.stringify(
      JSON.parse((await LocalStorage.getItem("favorites")) || "[]").filter(
        (favorite: FavoriteAyah) => favorite.ayahNumber !== ayah.ayahNumber || favorite.surahNumber !== ayah.surahNumber
      )
    )
  );

export const filterSurahs = (surahs: Surah[] | null | undefined, searchText: string): Surah[] | undefined => {
  if (!surahs) {
    return undefined;
  }

  const filteredSurahs = surahs.filter(
    (surah) =>
      surah.englishName.toLowerCase().includes(searchText.toLowerCase()) ||
      surah.number.toString().includes(searchText.toLowerCase())
  );

  return filteredSurahs;
};

export const getFavoriteAyahs = async (): Promise<FavoriteAyah[]> => {
  return JSON.parse((await LocalStorage.getItem("favorites")) || "[]");
};
