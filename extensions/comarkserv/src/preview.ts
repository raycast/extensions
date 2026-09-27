import { closeMainWindow, getSelectedFinderItems, open, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { basename } from "node:path";
import { defaultTheme, startPreview } from "./lib/previews";

export default async function Command() {
  const items = await getSelectedFinderItems().catch(() => []);
  const target = items[0]?.path;
  if (!target) {
    await showHUD("Select a markdown file or a folder in Finder");
    return;
  }
  await closeMainWindow();
  try {
    const preview = await startPreview(target, await defaultTheme());
    await open(preview.url);
    await showHUD(`Previewing ${basename(target)}`);
  } catch (error) {
    await showFailureToast(error, { title: "comarkserv did not start" });
  }
}
