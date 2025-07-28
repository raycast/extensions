import { showToast, Toast } from "@raycast/api";
import { findLaravelProjectRoot } from "../lib/projectLocator";
import { runComposer } from "../lib/composer";

export default async function Command() {
  await showToast({ style: Toast.Style.Animated, title: "Running Composer Install…" });

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

    await runComposer("install", cwd);

    await showToast({ style: Toast.Style.Success, title: "Composer Install Complete" });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Composer Install Failed",
      message: errorMessage,
    });
  }
}
