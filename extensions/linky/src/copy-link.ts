import { closeMainWindow, getSelectedFinderItems, open, showHUD } from "@raycast/api";
import { DOWNLOAD_URL, isLinkyInstalled, linkyURL, sendToLinky } from "./linky";

export default async function Command() {
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

  await closeMainWindow();
  // Linky creates the links, copies them in your chosen format and confirms with its own toast.
  await sendToLinky(paths.length > 0 ? linkyURL("copy", { path: paths }) : linkyURL("copy"));
}
