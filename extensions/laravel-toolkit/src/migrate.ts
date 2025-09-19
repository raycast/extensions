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
      title: "Running Laravel Migrations…",
      message: `in ${projectInfo}`,
    });

    await runArtisan("migrate", cwd);
    await showToast({
      style: Toast.Style.Success,
      title: "Migration Complete",
      message: `in ${projectInfo}`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Migration Failed",
      message: errorMessage,
    });
  }
}
