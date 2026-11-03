import { showToast, Toast } from "@raycast/api";
import { detectInstalledGames } from "./lib/game-detector";
import { refreshManifest } from "./lib/manifest";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Refreshing game database...",
  });

  try {
    const [index, installed] = await Promise.all([
      refreshManifest((msg) => {
        toast.message = msg;
      }),
      detectInstalledGames(true),
    ]);

    toast.style = Toast.Style.Success;
    toast.title = "Cache refreshed";
    toast.message = `${Object.keys(index).length.toLocaleString()} games · ${installed.length} installed`;
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to refresh";
    toast.message = String(err);
  }
}
