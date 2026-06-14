import {
  Clipboard,
  environment,
  LaunchType,
  showHUD,
  showInFinder,
} from "@raycast/api";
import { refreshHotIndex } from "./lib/hot-index";

export default async function Command() {
  const { count, directory } = await refreshHotIndex();

  if (environment.launchType === LaunchType.Background) {
    return;
  }

  await Clipboard.copy(directory);
  await showInFinder(directory);

  if (count === 0) {
    await showHUD("Lark Root Search shortcuts are empty. Folder path copied.");
    return;
  }

  await showHUD(`Refreshed ${count} Lark Root Search shortcuts.`);
}
