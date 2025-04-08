import { Toast, getApplications, getPreferenceValues, getSelectedFinderItems, open, showToast } from "@raycast/api";

import { exec } from "child_process";

interface OpenTraeCNPreferences {
  TraeCNVariant: string;
}

/**
 * Gets the selected Finder window.
 * @throws — An error when Finder is not the frontmost application.
 * @returns A Promise that resolves with the selected Finder window's path.
 */
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
  return new Promise((resolve, reject) => {
    const child = exec(`osascript -e '${appleScript}'`, (error, stdout, stderr) => {
      if (error || stderr) reject(Error("Could not get the selected Finder window"));
      resolve(stdout.trim());
    });

    child.on("close", () => {
    });
  });
};

export default async () => {
  const preferences = getPreferenceValues<OpenTraeCNPreferences>();
  const applications = await getApplications();
  const traeCNApplication = applications.find((app) => app.bundleId === preferences.TraeCNVariant);

  if (!traeCNApplication) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Trae CN is not installed",
      primaryAction: {
        title: "Install Trae CN",
        onAction: () => open("https://www.trae.com.cn/"),
      },
    });
    return;
  }

  try {
    const selectedFinderItems = await getSelectedFinderItems();
    if (selectedFinderItems.length) {
      for (const finderItem of selectedFinderItems) {
        await open(finderItem.path, traeCNApplication);
      }
      return;
    }
    const selectedFinderWindow = await getSelectedFinderWindow();
    await open(selectedFinderWindow, traeCNApplication);
    return;
  } catch (error: any) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No Finder items or window selected",
    });
  }
};
