import { closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { launcherOutcome, launcherPath } from "./dazzi";
import { DazziNotFoundError, resolveDazziApp, run } from "./runtime";

/**
 * Runs the `dazzi` launcher for a no-view command and tells the person what happened. The launcher returns as soon
 * as the running app took the request (or it started the app), so success is shown as a HUD and Raycast closes.
 */
export async function runLauncher(args: readonly string[], success: string): Promise<void> {
  let app: string;
  try {
    app = await resolveDazziApp();
  } catch (error) {
    await showFailureToast(error, {
      title: "Dazzi is not installed",
      ...(error instanceof DazziNotFoundError
        ? { message: "Install Dazzi, or set its location in the extension preferences." }
        : {}),
    });
    return;
  }
  const result = await run(app, launcherPath(app), args, { timeoutMs: 30_000 });
  if (result.failure !== undefined) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Dazzi did not take the request",
      message: `${result.failure.message} (${result.failure.code})`,
    });
    return;
  }
  const outcome = launcherOutcome(result.status, result.stderr);
  if (outcome.kind === "ok") {
    await closeMainWindow();
    await showHUD(success);
  } else if (outcome.kind === "partial") {
    await closeMainWindow();
    await showHUD(
      `${success} — skipped ${outcome.missing.length} missing item${outcome.missing.length === 1 ? "" : "s"}`,
    );
  } else if (outcome.kind === "outdated") {
    await showToast({
      style: Toast.Style.Failure,
      title: "Update Dazzi",
      message: "This version of Dazzi cannot take questions from Raycast yet.",
    });
  } else {
    await showToast({ style: Toast.Style.Failure, title: "Dazzi did not take the request", message: outcome.message });
  }
}
