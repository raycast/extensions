import { closeMainWindow, showHUD } from "@raycast/api";
import { readFinderFilesVisibility, toggleFinderFilesVisibility } from "./utils/applescript-utils";

export default async () => {
  await closeMainWindow({ clearRootSearch: false });
  const finderFilesVisibility = await readFinderFilesVisibility();
  if (finderFilesVisibility === "1") {
    await toggleFinderFilesVisibility(false);
    await showHUD(`Hiding hidden files…`);
  } else if (finderFilesVisibility === "0") {
    await toggleFinderFilesVisibility(true);
    await showHUD(`Showing hidden files…`);
  } else await showHUD(`Error: ${finderFilesVisibility}`);
};
