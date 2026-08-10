import { getApplications, getSelectedFinderItems, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { stat } from "fs/promises";

const execPromise = promisify(exec);

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
      child.kill();
    });
  });
};

export default async () => {
  const applications = await getApplications();
  const sublimeTextApplication = applications.find((app) => app.bundleId === "com.sublimetext.4");

  if (!sublimeTextApplication) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Sublime Text 4 is not installed",
      primaryAction: {
        title: "Install Sublime Text 4",
        onAction: () => open("https://www.sublimetext.com/download"),
      },
    });
    return;
  }

  const sublPath = `${sublimeTextApplication.path}/Contents/SharedSupport/bin/subl`;

  try {
    const selectedFinderItems = await getSelectedFinderItems();
    if (selectedFinderItems.length) {
      for (const finderItem of selectedFinderItems) {
        const stats = await stat(finderItem.path);
        if (stats.isDirectory()) {
          // Open the directory in a new window
          await execPromise(`"${sublPath}" -n "${finderItem.path}"`);
        } else {
          // Open the file in a new tab
          await execPromise(`"${sublPath}" -a "${finderItem.path}"`);
        }
      }
      return;
    }
    const selectedFinderWindow = await getSelectedFinderWindow();
    const stats = await stat(selectedFinderWindow);
    if (stats.isDirectory()) {
      await execPromise(`"${sublPath}" -n "${selectedFinderWindow}"`);
    } else {
      await execPromise(`"${sublPath}" -a "${selectedFinderWindow}"`);
    }
    return;
  } catch (error: any) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No Finder items or window selected",
    });
  }
};
