import { getSelectedFinderItems, open, showToast, Toast } from "@raycast/api";
import { getAndroidStudioApp, getSelectedFinderWindow, showAndroidStudioAppNotInstalled } from "./common/util";

export default async () => {
  const androidStudioApp = await getAndroidStudioApp();
  if (!androidStudioApp) {
    await showAndroidStudioAppNotInstalled();
    return;
  }

  try {
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
