import { getFocusFinderPath } from "./utils/applescript-utils";
import { Clipboard, closeMainWindow, getPreferenceValues, getSelectedFinderItems, showHUD } from "@raycast/api";
import { Preferences } from "./types/preferences";

export default async () => {
  try {
    const { multiPathSeparator } = getPreferenceValues<Preferences>();
    await closeMainWindow();
    const fileSystemItems = await getSelectedFinderItems();
    if (fileSystemItems.length === 0) {
      await copyFinderPath();
    } else {
      const filePaths = fileSystemItems.map((item) =>
        item.path.endsWith("/") && item.path.length !== 1 ? item.path.slice(0, -1) : item.path
      );

      const output = filePaths.join(multiPathSeparator);
      await Clipboard.copy(output);
      await showHUD("Copy: " + (filePaths.length > 1 ? filePaths[0] + "..." : filePaths[0]));
    }
  } catch (e) {
    await copyFinderPath();
    console.error(String(e));
  }
};

const copyFinderPath = async () => {
  const finderPath = await getFocusFinderPath();
  await Clipboard.copy(finderPath);
  await showHUD("Copy: " + finderPath);
};
