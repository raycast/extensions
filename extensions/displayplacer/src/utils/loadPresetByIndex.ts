import { LocalStorage, showHUD } from "@raycast/api";
import { listScreenInfo, switchSettings } from "./displayplacer";

export default async function loadPresetByIndex(index: number) {
  try {
    listScreenInfo();
  } catch (e) {
    console.error(e);
    showHUD("Error: Cannot load displayplacer utility. Ensure it's installed on your system.");
    return;
  }

  const myFavs = await LocalStorage.getItem("favorites");
  if (!myFavs) return;
  const favorites: Favorite[] = JSON.parse(myFavs.toString());
  const fav = favorites[index];
  if (!fav) {
    showHUD("Favorite not found");
    return;
  }
  switchSettings(fav);
}
