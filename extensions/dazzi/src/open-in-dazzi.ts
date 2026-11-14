import { getSelectedFinderItems, showToast, Toast } from "@raycast/api";
import { openArgs } from "./lib/dazzi";
import { runLauncher } from "./lib/launch";

/** Open in Dazzi: every selected folder opens in a tab, every selected file is shown selected in its folder. */
export default async function Command(): Promise<void> {
  const items = await getSelectedFinderItems().catch(() => []);
  if (items.length === 0) {
    await showToast({ style: Toast.Style.Failure, title: "Select files or folders in Finder first" });
    return;
  }
  await runLauncher(openArgs(items.map((item) => item.path)), "Opened in Dazzi");
}
