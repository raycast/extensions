import { getSelectedFinderItems, open, showHUD, showToast, Toast } from "@raycast/api";
import {
  getAndroidStudioApp,
  getSelectedFinderWindow,
  isValidDirectoryPath,
  showAndroidStudioAppNotInstalled,
} from "./common/util";

export default async ({ launchContext }: { launchContext?: { defaultValue: string } }) => {
  const androidStudioApp = await getAndroidStudioApp();
  if (!androidStudioApp) {
    await showAndroidStudioAppNotInstalled();
    return;
  }
  try {
    if (launchContext?.defaultValue) {
      if (isValidDirectoryPath(launchContext.defaultValue)) {
        await open(launchContext.defaultValue, androidStudioApp);
      } else {
        await showHUD("Invalid Path ❌");
      }
      return;
    }
    const selectedFinderItems = await getSelectedFinderItems();
    if (selectedFinderItems.length) {
      for (const finderItem of selectedFinderItems) {
        await open(finderItem.path, androidStudioApp);
      }
      return;
    }
    const selectedFinderWindow = await getSelectedFinderWindow();
    await open(selectedFinderWindow, androidStudioApp);
    return;
  } catch (error: any) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No Finder items or window selected",
    });
  }
};
