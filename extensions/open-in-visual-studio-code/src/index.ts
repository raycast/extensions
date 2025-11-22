import {
  Application,
  getApplications,
  getPreferenceValues,
  getSelectedFinderItems,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { getActiveExplorerWindow, getSelectedFinderWindow, isMac } from "./utils";

const getActiveFileManagerWindow = (): Promise<string> => {
  return isMac ? getSelectedFinderWindow() : getActiveExplorerWindow();
};

export default async () => {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const applications = await getApplications();
  let vscodeApplication: Application | undefined;

  const appNameMap = {
    "com.microsoft.VSCode": "Visual Studio Code",
    "com.microsoft.VSCodeInsiders": "Visual Studio Code - Insiders",
    "com.vscodium": "VSCodium",
    "com.todesktop.230313mzl4w4u92": "Cursor",
  };

  const appName = appNameMap[preferences.VSCodeVariant];

  if (isMac) {
    vscodeApplication = applications.find((app) => app.bundleId === preferences.VSCodeVariant);
  } else {
    if (appName) {
      vscodeApplication = applications.find((app) => app.name.includes(appName));
    }
  }

  if (!vscodeApplication) {
    await showToast({
      style: Toast.Style.Failure,
      title: `${appName || "Code Editor"} is not installed`,
      primaryAction: {
        title: "Install Visual Studio Code",
        onAction: () => open("https://code.visualstudio.com/download"),
      },
      secondaryAction: {
        title: "Install VSCodium",
        onAction: () => open("https://github.com/VSCodium/vscodium/releases"),
      },
    });
    return;
  }

  try {
    const selectedFinderItems = await getSelectedFinderItems();

    if (selectedFinderItems.length) {
      for (const finderItem of selectedFinderItems) {
        await open(finderItem.path, vscodeApplication);
      }
      return;
    }

    const activeFileManagerPath = await getActiveFileManagerWindow();
    await open(activeFileManagerPath, vscodeApplication);
    return;
  } catch {
    const fileManagerName = isMac ? "Finder" : "File Explorer";
    await showToast({
      style: Toast.Style.Failure,
      title: `No ${fileManagerName} items or window selected`,
    });
  }
};
