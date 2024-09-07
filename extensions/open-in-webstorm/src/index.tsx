import { getSelectedFinderItems, open, showHUD, showToast, Toast } from "@raycast/api";
import {
  getWebstormApp,
  getSelectedFinderWindow,
  isValidDirectoryPath,
  showWebstormAppNotInstalled,
} from "./common/util";

export default async ({ launchContext }: { launchContext?: { defaultValue: string } }) => {
  const webstorm = await getWebstormApp();
  if (!webstorm) {
    await showWebstormAppNotInstalled();
    return;
  }
  try {
    if (launchContext?.defaultValue) {
      if (isValidDirectoryPath(launchContext.defaultValue)) {
        await open(launchContext.defaultValue, webstorm);
      } else {
        await showHUD("Invalid Path ❌");
      }
      return;
    }
    const selectedFinderItems = await getSelectedFinderItems();
    if (selectedFinderItems.length) {
      for (const finderItem of selectedFinderItems) {
        await open(finderItem.path, webstorm);
      }
      return;
    }
    const selectedFinderWindow = await getSelectedFinderWindow();
    await open(selectedFinderWindow, webstorm);
    return;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No Finder items or window selected",
    });
  }
};
