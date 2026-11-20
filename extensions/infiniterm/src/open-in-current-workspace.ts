import { showFailureToast } from "@raycast/utils";
import { getFinderDirs } from "./lib/finder.ts";
import { openFolders } from "./lib/ift.ts";

export default async function Command() {
  try {
    await openFolders(await getFinderDirs());
  } catch (e) {
    await showFailureToast(e, { title: "Could not read Finder" });
  }
}
