import { commonPreferences, getFocusFinderPath } from "./utils/common-utils";
import { Clipboard, closeMainWindow, getSelectedFinderItems, showHUD } from "@raycast/api";
import { parse } from "path";

export default async () => {
  try {
    const { multiPathSeparator } = commonPreferences();
    await closeMainWindow();
    const fileSystemItems = await getSelectedFinderItems();
    if (fileSystemItems.length === 0) {
      await copyFinderPath();
    } else {
      const filePaths = fileSystemItems.map((item) => {
        const parsedPath = parse(item.path);
        return parsedPath.dir + "/" + parsedPath.base;
      });

      console.debug(multiPathSeparator);
      const output = filePaths.join(multiPathSeparator);
      await Clipboard.copy(output);
      await showHUD("Copy: " + filePaths[0]);
    }
  } catch (e) {
    await copyFinderPath();
    console.error(String(e));
  }
};

const copyFinderPath = async () => {
  const finderPath = await getFocusFinderPath();
  const parsedPath = parse(finderPath);
  const output = parsedPath.dir + "/" + parsedPath.base;
  await Clipboard.copy(output);
  await showHUD("Copy: " + output);
};
