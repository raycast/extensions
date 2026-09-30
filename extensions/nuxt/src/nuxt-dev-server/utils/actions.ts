/**
 * Action handlers for menu bar commands
 */

import { open, showToast, Toast, launchCommand, LaunchType } from "@raycast/api";
import { killProcess, normalizeGitUrl } from "./system";

/**
 * Open browser at specified port
 */
export async function handleOpenBrowser(port: string): Promise<void> {
  try {
    await open(`http://localhost:${port}`);
    await showToast({
      style: Toast.Style.Success,
      title: `Opening localhost:${port}`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open browser",
      message: String(error),
    });
  }
}

/**
 * Stop a Nuxt server process
 */
export async function handleStopServer(pid: string, revalidate: () => void): Promise<void> {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Stopping Nuxt server...",
    });

    killProcess(pid);

    await showToast({
      style: Toast.Style.Success,
      title: "Server stopped",
    });

    // Refresh the process list
    revalidate();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to stop server",
      message: String(error),
    });
  }
}

/**
 * Open GitHub repository in browser
 */
export async function handleOpenRepository(repoUrl: string): Promise<void> {
  try {
    const cleanUrl = normalizeGitUrl(repoUrl);
    await open(cleanUrl);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open repository",
      message: String(error),
    });
  }
}

/**
 * Launch a Raycast command
 */
export async function handleLaunchCommand(commandName: string, title: string): Promise<void> {
  try {
    await launchCommand({ name: commandName, type: LaunchType.UserInitiated });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Failed to open ${title}`,
      message: String(error),
    });
  }
}
