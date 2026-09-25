import { execFile } from "child_process";
import { promisify } from "util";
import { Alert, Color, confirmAlert, Icon, showHUD, showToast, Toast } from "@raycast/api";
import { failToast, getErrorMessage, showError } from "@chrismessina/raycast-kit";

const execFileAsync = promisify(execFile);

// macOS `open` emits this when -a names an application it cannot resolve.
// Verified 2026-09-09: `open -a Nonexistent chrome://settings` →
// "Unable to find application named 'Nonexistent'". It does NOT say "Application not found".
const APP_NOT_FOUND = "unable to find application named";

async function revealAppInFinder(app: string, appName: string) {
  try {
    // -R takes ONE operand, the thing to select. Passing `/Applications -R "X.app"` resolves
    // "X.app" against the CWD instead of /Applications, and reveals nothing.
    // `app` is already an absolute path when discovery found the bundle; otherwise guess.
    await execFileAsync("/usr/bin/open", ["-R", app.startsWith("/") ? app : `/Applications/${app}.app`]);
  } catch (error) {
    await showError(error, {
      title: "Couldn't Reveal the App",
      message: `${appName} is not in your Applications folder.`,
      copyContext: `appName=${appName}`,
    });
  }
}

/** The command being launched. Required, so a new call site cannot forget the destructive check. */
export interface LaunchedCommand {
  /** Display name, used in the confirmation prompt. */
  name: string;
  /** True when the URL deliberately crashes, hangs, or quits the browser. */
  isDebugCommand?: boolean;
}

export interface BrowserTarget {
  /**
   * What to hand `open -a`. The discovered application's absolute path whenever we have it, so the
   * app we launch is the one whose icon we showed — a bare name is resolved by Launch Services and
   * can select a different copy. Falls back to the configured application name while discovery has
   * not answered.
   */
  app: string;
  /** The browser's display name, for toasts. `app` may be a path, which is not worth reading. */
  name: string;
}

/**
 * Opens a URL in a specific browser via macOS `open -a`.
 *
 * macOS only — `/usr/bin/open` does not exist on Windows, which is why the UI withholds every
 * action that reaches this function when `process.platform` is not darwin.
 *
 * @param target - Which application to launch, and what to call it.
 * @param url - The full URL to open (e.g., "chrome://settings").
 * @param options.showSuccess - Show a success HUD. Defaults to true.
 * @param command - What is being launched. Required and non-optional on purpose: the destructive
 *   confirmation is decided HERE from `isDebugCommand`, not by each caller remembering to ask. The
 *   "Open in…" submenu forgot to ask exactly once, and an optional flag would let the next route
 *   forget too — this way the compiler stops it.
 */
export async function openUrlInBrowser(
  { app, name: appName }: BrowserTarget,
  url: string,
  command: LaunchedCommand,
  { showSuccess = true }: { showSuccess?: boolean } = {},
): Promise<void> {
  if (
    command.isDebugCommand &&
    !(await confirmAlert({
      title: `Run ${command.name}?`,
      message: `${url} is a debug command. It will crash, hang, or quit ${appName}, and anything unsaved there may be lost.`,
      icon: { source: Icon.Bug, tintColor: Color.Red },
      primaryAction: { title: `Run in ${appName}`, style: Alert.ActionStyle.Destructive },
    }))
  ) {
    return;
  }

  // A Toast, not a HUD. showHUD closes the Raycast window, and a failure raised afterwards has
  // nowhere to render its Copy Error action — the user gets a bare HUD and no way to report it.
  // The toast still fires before the async work, so the UI never looks idle.
  const toast = await showToast({ style: Toast.Style.Animated, title: `Opening in ${appName}…` });

  try {
    // execFile, not exec: no shell, so nothing in appName or url is ever word-split, expanded,
    // or interpreted. `open -a` foregrounds by default — do NOT add -F, which means "fresh"
    // and discards the browser's restored windows.
    await execFileAsync("/usr/bin/open", ["-a", app, url]);
  } catch (error) {
    if (getErrorMessage(error).toLowerCase().includes(APP_NOT_FOUND)) {
      failToast(toast, error, {
        title: "Application Not Found",
        message: `Could not find ${appName}.`,
        action: { title: "Reveal in Finder", onAction: () => revealAppInFinder(app, appName) },
        copyContext: `app=${app} url=${url}`,
      });
    } else {
      failToast(toast, error, {
        title: "Couldn't Open URL",
        message: `Could not open ${url} in ${appName}.`,
        copyContext: `app=${app} url=${url}`,
      });
    }
    return;
  }

  await toast.hide();
  if (showSuccess) {
    // Only now — the HUD dismisses Raycast, which is the right ending for a successful hand-off.
    await showHUD(`Opened in ${appName}`);
  }
}
