import { showFailureToast } from "@raycast/utils";
import { getFinderPaths } from "./lib/finder.ts";
import { openDiffs } from "./lib/ift.ts";

export default async function Command() {
  try {
    await openDiffs(await getFinderPaths());
  } catch (e) {
    await showFailureToast(e, { title: "Could not read Finder" });
  }
}
