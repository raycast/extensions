import { Application, getApplications, getSelectedFinderItems, open, showToast, Toast } from "@raycast/api";
import { getSelectedFinderWindow } from "./utils";

const ZED_BUNDLE_ID = "dev.zed.Zed";

export default async () => {
  const applications = await getApplications();
  const zedApplication: Application | undefined = applications.find((app) => app.bundleId === ZED_BUNDLE_ID);

  if (!zedApplication) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Zed is not installed",
      primaryAction: {
        title: "Download Zed",
        onAction: () => open("https://zed.dev/download"),
      },
    });
    return;
  }

  try {
    const selectedFinderItems = await getSelectedFinderItems();

    if (selectedFinderItems.length) {
      for (const finderItem of selectedFinderItems) {
        await open(finderItem.path, zedApplication);
      }
      return;
    }

    const activeFinderPath = await getSelectedFinderWindow();

    if (!activeFinderPath) throw new Error();

    await open(activeFinderPath, zedApplication);
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "No Finder items or window selected",
    });
  }
};
