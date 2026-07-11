import { getApplications, open, showToast, Toast, Clipboard } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

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
    const [, clipboardContent] = await Promise.all([open(sublimeTextApplication.path), Clipboard.readText()]);

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

    await runAppleScript(appleScript);
  } catch (error: any) {
    await showToast({
      style: Toast.Style.Failure,
      title: error.message,
    });
  }
};
