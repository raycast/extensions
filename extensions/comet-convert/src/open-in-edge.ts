import { showHUD, showToast, Toast, environment } from "@raycast/api";
import { execSync } from "child_process";

export default async function Command() {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Getting current tab...",
    });

    // Get the current URL from Comet
    const url = await getCurrentCometURL();

    if (!url) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No active tab found",
        message: "Please open a tab in Comet first",
      });
      return;
    }

    // Open the URL in Microsoft Edge
    await openInEdge(url);

    await showHUD("🚀 Opened in Microsoft Edge");
  } catch (error) {
    console.error("Error:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open in Edge",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function getCurrentCometURL(): Promise<string | null> {
  try {
    const script = `
      tell application "Comet"
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
    console.error("Error getting Comet URL:", error);
    throw new Error("Could not get URL from Comet. Is Comet running?");
  }
}

async function openInEdge(url: string): Promise<void> {
  try {
    const script = `
      tell application "Microsoft Edge"
        activate
        open location "${url}"
      end tell
    `;

    execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, {
      encoding: "utf8",
    });
  } catch (error) {
    console.error("Error opening in Edge:", error);
    throw new Error("Could not open in Microsoft Edge. Is Edge installed?");
  }
}
