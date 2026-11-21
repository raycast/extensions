import { closeMainWindow, getSelectedFinderItems, open, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { DOWNLOAD_URL, isLinkyInstalled, linkyURL, sendToLinky } from "./linky";

export default async function Command() {
  try {
    if (!(await isLinkyInstalled())) {
      await showHUD("Linky is not installed. Opening the download page.");
      await open(DOWNLOAD_URL);
      return;
    }

    let paths: string[] = [];
    try {
      paths = (await getSelectedFinderItems()).map((item) => item.path);
    } catch {
      // Finder is not frontmost: Linky reads the Finder selection itself.
    }

    // Linky creates the links, copies them in the chosen format and confirms with its own HUD.
    await sendToLinky(paths.length > 0 ? linkyURL("copy", { path: paths }) : linkyURL("copy"));
    await closeMainWindow();
  } catch (error) {
    await showFailureToast(error, { title: "Could Not Copy Linky Link" });
  }
}
