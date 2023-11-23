import { Application, Toast, getApplications, open, showToast } from "@raycast/api";
import { exec } from "child_process";
import fs from "fs";

const asPackageName = "com.google.android.studio";

export async function getAndroidStudioApp(): Promise<Application | undefined> {
  const applications = await getApplications();
  const androidStudioApplication = applications.find((app) => app.bundleId === asPackageName);
  return androidStudioApplication;
}

export async function getFinderApp(): Promise<Application | undefined> {
  const applications = await getApplications();
  const finderApp = applications.find((app) => app.bundleId === "com.apple.finder");
  return finderApp;
}

export async function showAndroidStudioAppNotInstalled() {
  await showToast({
    style: Toast.Style.Failure,
    title: "Android Studio is not installed",
    primaryAction: {
      title: "Install Android Studio",
      onAction: () => open("https://developer.android.com/studio"),
    },
  });
}

/**
 * Gets the selected Finder window.
 * @throws — An error when Finder is not the frontmost application.
 * @returns A Promise that resolves with the selected Finder window's path.
 */
export const getSelectedFinderWindow = (): Promise<string> => {
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

export function isValidDirectoryPath(directoryPath: string): boolean {
  try {
    // Check if the directory exists and is a directory (not a file or a symlink)
    return fs.existsSync(directoryPath) && fs.statSync(directoryPath).isDirectory();
  } catch (error) {
    // Handle any potential errors (e.g., permission issues, invalid paths)
    return false;
  }
}
