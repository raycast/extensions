import {
  Application,
  getApplications,
  getPreferenceValues,
  getSelectedFinderItems,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { runPowerShellScript, runAppleScript } from "@raycast/utils";
import { isMac } from "./utils";

const getSelectedFinderWindow = (): Promise<string> => {
  const appleScript = `
  if application "Finder" is running and frontmost of application "Finder" then
    tell app "Finder"
      set finderWindow to window 1
      set finderWindowPath to (POSIX path of (target of finderWindow as alias))
      return finderWindowPath
    end tell
  else 
    error "Could not get the selected Finder window"
  end if
 `;
  return runAppleScript(appleScript)
    .then((result) => result.trim())
    .catch(() => {
      throw new Error("Could not get the selected Finder window");
    });
};

const getActiveExplorerWindow = async (): Promise<string> => {
  const script = `
    $shell = New-Object -ComObject Shell.Application
    $windows = $shell.Windows()
    
    foreach ($window in $windows) {
      if ($window.Name -eq "File Explorer") {
        $path = $window.Document.Folder.Self.Path
        if ($path) {
          Write-Output $path
          exit 0
        }
      }
    }
    exit 1
  `;

  try {
    const result = await runPowerShellScript(script);
    if (!result.trim()) {
      throw new Error("Could not get the active File Explorer window");
    }
    return result.trim();
  } catch {
    throw new Error("Could not get the active File Explorer window");
  }
};

const getActiveFileManagerWindow = (): Promise<string> => {
  return isMac ? getSelectedFinderWindow() : getActiveExplorerWindow();
};

export default async () => {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const applications = await getApplications();
  let vscodeApplication: Application | undefined;

  if (isMac) {
    vscodeApplication = applications.find((app) => app.bundleId === preferences.VSCodeVariant);
  } else {
    const appNameMap: Record<string, string> = {
      "com.microsoft.VSCode": "Visual Studio Code",
      "com.microsoft.VSCodeInsiders": "Visual Studio Code - Insiders",
      "com.vscodium": "VSCodium",
      "com.todesktop.230313mzl4w4u92": "Cursor",
    };
    const appName = appNameMap[preferences.VSCodeVariant];
    if (appName) {
      vscodeApplication = applications.find((app) => app.name.includes(appName));
    }
  }

  if (!vscodeApplication) {
    await showToast({
      style: Toast.Style.Failure,
      title: `${preferences.VSCodeVariant} is not installed`,
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
