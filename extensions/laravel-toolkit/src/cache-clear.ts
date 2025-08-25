import { showToast, Toast } from "@raycast/api";
import { findLaravelProjectRoot } from "../lib/projectLocator";
import { runArtisan } from "../lib/artisan";
import { formatProjectInfo } from "../lib/projectDisplay";

export default async function Command() {
  try {
    const cwd = await findLaravelProjectRoot();
    if (!cwd) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Laravel Project Found",
        message: "Please add a Laravel project first",
      });
      return;
    }

    const projectInfo = formatProjectInfo(cwd);
    await showToast({
      style: Toast.Style.Animated,
      title: "Clearing Laravel Caches…",
      message: `in ${projectInfo}`,
    });

    // Clear multiple cache types
    const cacheCommands = ["cache:clear", "config:clear", "route:clear", "view:clear"];

    for (const command of cacheCommands) {
      try {
        await runArtisan(command, cwd);
      } catch (error) {
        // Some cache commands might fail if cache doesn't exist, that's ok
        console.warn(`Cache command '${command}' warning:`, error);
      }
    }

    await showToast({
      style: Toast.Style.Success,
      title: "Caches Cleared",
      message: `All Laravel caches cleared in ${projectInfo}`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Cache Clear Failed",
      message: errorMessage,
    });
  }
}
