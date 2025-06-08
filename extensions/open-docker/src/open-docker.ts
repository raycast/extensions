import { closeMainWindow, getApplications, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";

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

    exec(`osascript -e '${script}'`, async (error) => {
      if (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to open Docker Desktop",
          message: error.message,
        });
        return;
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Docker Desktop is opening",
        message: "Switching to Docker Desktop...",
      });
    });

    await closeMainWindow();
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "An unexpected error occurred",
      message: e instanceof Error ? e.message : "Unknown error",
    });
  }
}
