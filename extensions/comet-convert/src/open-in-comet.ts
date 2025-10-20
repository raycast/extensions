import { showHUD, showToast, Toast, environment } from "@raycast/api";
import { execSync } from "child_process";

export default async function Command() {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Getting current tab...",
    });

    // Get the current URL from Microsoft Edge
    const url = await getCurrentEdgeURL();

    if (!url) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No active tab found",
        message: "Please open a tab in Microsoft Edge first",
      });
      return;
    }

    // Open the URL in Comet browser
    await openInComet(url);

    await showHUD("🚀 Opened in Comet browser");
  } catch (error) {
    console.error("Error:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open in Comet",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function getCurrentEdgeURL(): Promise<string | null> {
  try {
    const script = `
      tell application "Microsoft Edge"
        if (count of windows) = 0 then
          return ""
        end if
        
        set currentTab to active tab of front window
        return URL of currentTab
      end tell
    `;

    const result = execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, {
      encoding: "utf8",
    });
    return result.trim() || null;
  } catch (error) {
    console.error("Error getting Edge URL:", error);
    throw new Error("Could not get URL from Microsoft Edge. Is Edge running?");
  }
}

async function openInComet(url: string): Promise<void> {
  try {
    const script = `
      tell application "Comet"
        activate
        open location "${url}"
      end tell
    `;

    execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, {
      encoding: "utf8",
    });
  } catch (error) {
    console.error("Error opening in Comet:", error);
    throw new Error("Could not open in Comet browser. Is Comet installed?");
  }
}
