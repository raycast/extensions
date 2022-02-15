import { LocalStorage } from "@raycast/api";
import { switchSettings } from "./displayplacer";

export default async function loadPresetByIndex(index: number) {
  const myFavs = await LocalStorage.getItem("favorites");
  if (!myFavs) return;
  const favorites: Favorite[] = JSON.parse(myFavs.toString());
  const fav = favorites[index];
  if (!fav) return;
  switchSettings(fav);
}
