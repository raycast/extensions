import { getApplications, getSelectedFinderItems, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { exec } from "child_process";

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
    exec(`osascript -e '${appleScript}'`, (error, stdout, stderr) => {
      if (error || stderr) reject(Error("Could not get the selected Finder window"));
      resolve(stdout.trim());
    });
  });
};

export default async () => {
  const applications = await getApplications();
  const traeApplication = applications.find((app) => app.bundleId === "com.trae.app");

  if (!traeApplication) {
    await showFailureToast("Trae is not installed", {
      primaryAction: {
        title: "Install Trae",
        onAction: () => open("https://www.trae.ai/"),
      },
    });
    return;
  }

  try {
    const selectedFinderItems = await getSelectedFinderItems();
    if (selectedFinderItems.length) {
      for (const finderItem of selectedFinderItems) {
        await open(finderItem.path, traeApplication);
      }
      return;
    }
    const selectedFinderWindow = await getSelectedFinderWindow();
    await open(selectedFinderWindow, traeApplication);
    return;
  } catch {
    await showFailureToast("No Finder items or window selected");
  }
};
