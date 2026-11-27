import { closeMainWindow, getApplications, open, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { ActionID, getAction } from "./actions";
import { explainMenuError, menuScript, readMenuTitles } from "./menu";

export const website = "https://screenflare.app";
export const accessibilitySettings = "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility";

export async function runAction(id: ActionID): Promise<void> {
  try {
    const app = (await getApplications()).find((item) => item.bundleId === "app.screenflare");
    if (!app) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Install Screenflare first",
        message: "Screenflare is required to use this extension.",
        primaryAction: { title: "Download Screenflare", onAction: () => open(website) },
      });
      return;
    }
    const action = getAction(id);
    const keys: string[] = [action.key];
    if ("alternateKey" in action) keys.push(action.alternateKey);
    const titles = await readMenuTitles(app.path, keys);
    await closeMainWindow();
    const result = await runAppleScript<string>(menuScript, titles, { timeout: 12000 });
    if (result.trim() !== "invoked") throw new Error("Screenflare did not acknowledge the menu action.");
    // Capture overlays own all subsequent feedback; a success HUD would appear in the shot.
  } catch (error) {
    const failure = explainMenuError(error);
    await showToast({
      style: Toast.Style.Failure,
      title: failure.title,
      message: failure.message,
      primaryAction: failure.permission
        ? { title: "Open Accessibility Settings", onAction: () => open(accessibilitySettings) }
        : { title: "Open Screenflare Help", onAction: () => open(`${website}/docs/troubleshooting`) },
    });
  }
}
