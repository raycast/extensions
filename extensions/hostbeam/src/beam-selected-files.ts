import { closeMainWindow, getSelectedFinderItems, showHUD } from "@raycast/api";

import { openHostbeam } from "./hostbeam";

/** Beam what is selected in Finder.
 *
 *  This needs no permission from the app and no scheme: handing files to
 *  Hostbeam is what `open` has always done, and the app parks them until its
 *  window is ready — so it works from a cold start too.
 */
export default async function main() {
  let files: string[] = [];
  try {
    files = (await getSelectedFinderItems()).map((item) => item.path);
  } catch {
    await showHUD("Select something in Finder first");
    return;
  }
  if (files.length === 0) {
    await showHUD("Nothing selected in Finder");
    return;
  }
  await closeMainWindow();
  const problem = await openHostbeam(files);
  if (problem) await showHUD(problem);
}
