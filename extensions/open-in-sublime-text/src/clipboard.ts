import { getApplications, open, showToast, Toast, Clipboard } from "@raycast/api";
import { exec } from "child_process";

export default async () => {
  const applications = await getApplications();
  // const sublimeTextApplication = applications.find((app) => app.bundleId === "com.sublimetext");
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

  try {
    await open(sublimeTextApplication.path);

    const clipboardContent = await Clipboard.readText();
    if (!clipboardContent) {
      throw new Error("Clipboard is empty");
    }

    const appleScript = `
      tell application "Sublime Text"
        activate
        tell application "System Events"
          keystroke "n" using command down
          keystroke "v" using command down
        end tell
      end tell
    `;

    exec(`osascript -e '${appleScript}'`, (error, stdout, stderr) => {
      if (error || stderr) {
        throw new Error("Could not paste clipboard content into Sublime Text");
      }
    });
  } catch (error: any) {
    await showToast({
      style: Toast.Style.Failure,
      title: error.message,
    });
  }
};
