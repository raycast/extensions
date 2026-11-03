import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { detectInstalledGames } from "./lib/game-detector";
import { loadManifest, updateManifest } from "./lib/manifest";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Refreshing game database...",
  });

  try {
    const [, installed] = await Promise.all([
      updateManifest((msg) => {
        toast.message = msg;
      }),
      detectInstalledGames(true),
    ]);
    const index = await loadManifest();

    toast.style = Toast.Style.Success;
    toast.title = "Cache refreshed";
    toast.message = `${Object.keys(index).length.toLocaleString()} games · ${installed.length} installed`;
  } catch (err) {
    await showFailureToast(err, { title: "Failed to refresh" });
  }
}
