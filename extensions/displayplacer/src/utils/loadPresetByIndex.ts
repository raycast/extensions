import { closeMainWindow, LocalStorage, showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";
import { PATH, switchSettings } from "./displayplacer";

export default async function loadPresetByIndex(index: number) {
  try {
    execSync(`zsh -l -c 'PATH=${PATH} displayplacer list'`);
  } catch (e) {
    showToast({
      title: "Error",
      message: "Display Placer utility not detected on your system.",
      style: Toast.Style.Failure,
    });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Switching Display Settings...",
  });

  const myFavs = JSON.parse((await LocalStorage.getItem("favorites"))?.toString() ?? "[]");
  console.log("myFavorites", myFavs);

  if (!myFavs) return;
  const fav = myFavs[index];

  if (!fav) {
    console.log("No favorite found at index", index);
    await toast.hide();
    showToast({ title: "Error", message: "Favorite not found", style: Toast.Style.Failure });
    return;
  }
  try {
    switchSettings(fav);
  } catch {
    await toast.hide();
    showToast({
      title: "Error",
      message: "Display Placer not detected on your system. Please install to continue",
      style: Toast.Style.Failure,
    });
    return;
  }
  await closeMainWindow();
  await toast.hide();
}
