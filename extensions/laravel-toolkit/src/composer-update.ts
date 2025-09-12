import { showToast, Toast } from "@raycast/api";
import { findLaravelProjectRoot } from "../lib/projectLocator";
import { runComposer } from "../lib/composer";

export default async function Command() {
  await showToast({ style: Toast.Style.Animated, title: "Running Composer Update…" });

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

    await runComposer("update", cwd);

    await showToast({ style: Toast.Style.Success, title: "Composer Update Complete" });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Composer Update Failed",
      message: errorMessage,
    });
  }
}
