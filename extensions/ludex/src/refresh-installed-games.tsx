import { showToast, Toast } from "@raycast/api";
import { detectInstalledGames } from "./lib/game-detector";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Detecting installed games...",
  });

  try {
    const games = await detectInstalledGames(true);

    toast.style = Toast.Style.Success;
    toast.title = "Installed games refreshed";
    toast.message = `${games.length} game${games.length !== 1 ? "s" : ""} found`;
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to detect games";
    toast.message = String(err);
  }
}
