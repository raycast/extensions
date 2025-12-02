import { closeMainWindow, getApplications, showToast, Toast } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";

export default async function Command() {
  try {
    // 1. Check if Docker Desktop is installed using Raycast API
    const applications = await getApplications();
    const dockerApp = applications.find((app) => app.bundleId === "com.docker.docker");

    if (!dockerApp) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Docker Desktop is not installed",
        message: "Please install Docker Desktop to use this command.",
      });
      return;
    }

    // 2. Use reopen to ensure Docker opens even when hidden, then activate to switch desktops
    const script = `
      tell application "Docker Desktop" to reopen
      delay 0.5
      tell application "Docker Desktop" to activate
    `;

    try {
      await runAppleScript(script);

      await showToast({
        style: Toast.Style.Success,
        title: "Docker Desktop is opening",
        message: "Switching to Docker Desktop...",
      });
    } catch (error) {
      await showFailureToast(error, {
        title: "Failed to open Docker Desktop",
      });
      return;
    }

    await closeMainWindow();
  } catch (e) {
    await showFailureToast(e, {
      title: "An unexpected error occurred",
    });
  }
}
