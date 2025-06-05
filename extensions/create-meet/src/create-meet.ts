import { showToast, Toast, closeMainWindow } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export default async function Command() {
  await closeMainWindow();

  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Creating Google Meet...",
    });

    await execAsync('open "https://meet.new"');
    await new Promise((resolve) => setTimeout(resolve, 4000));

    await execAsync(
      `osascript -e 'tell application "System Events" to tell (first application process whose frontmost is true) to keystroke "l" using command down'`,
    );
    await new Promise((resolve) => setTimeout(resolve, 500));

    await execAsync(
      `osascript -e 'tell application "System Events" to tell (first application process whose frontmost is true) to keystroke "c" using command down'`,
    );

    await showToast({
      style: Toast.Style.Success,
      title: "Meet URL copied to clipboard",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to create meet",
      message: String(error),
    });
  }
}
