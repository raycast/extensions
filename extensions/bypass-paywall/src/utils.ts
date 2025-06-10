import { runAppleScript, showFailureToast } from "@raycast/utils";

interface BrowserInfo {
  engine: "webkit" | "chromium" | "gecko";
}

// List of supported and tested browsers
const SUPPORTED_BROWSERS: Record<string, BrowserInfo> = {
  // WebKit
  Safari: { engine: "webkit" },
  Orion: { engine: "webkit" },
  "Orion RC": { engine: "webkit" },

  // Chromium
  "Google Chrome": { engine: "chromium" },
  "Microsoft Edge": { engine: "chromium" },
  "Brave Browser": { engine: "chromium" },
  Vivaldi: { engine: "chromium" },
  Arc: { engine: "chromium" },

  // Gecko
  firefox: { engine: "gecko" },
  zen: { engine: "gecko" },
};

async function getActiveBrowserInfo(): Promise<{ name: string; engine: BrowserInfo["engine"] }> {
  const script = 'tell application "System Events" to get name of first application process whose frontmost is true';
  let frontmostAppName: string;

  try {
    frontmostAppName = await runAppleScript(script);
  } catch (error) {
    await showFailureToast(error, {
      title: "Error Getting Active App",
      message: "Could not determine the frontmost application.",
    });
    throw new Error("Script failed to get frontmost application name.");
  }

  const browserInfo = SUPPORTED_BROWSERS[frontmostAppName];
  if (browserInfo) {
    return { name: frontmostAppName, engine: browserInfo.engine };
  } else {
    // If there's unknown browser – assume that's Chromium (works in most cases)
    return { name: frontmostAppName, engine: "chromium" };
  }
}

export async function getCurrentTabURL(): Promise<string> {
  const browserInfo = await getActiveBrowserInfo();
  // Escape quotes in browser name to prevent script injection
  const escapedBrowserName = browserInfo.name.replace(/"/g, '""');

  let script = "";
  if (browserInfo.engine === "webkit") {
    script = `tell application "${escapedBrowserName}" to return URL of current tab of front window`;
  } else if (browserInfo.engine === "chromium") {
    // Most Chromium-based browsers use a similar script
    script = `tell application "${escapedBrowserName}" to return URL of active tab of front window`;
  } else if (browserInfo.engine === "gecko") {
    // Firefox (Gecko) requires a workaround using clipboard
    script = `
      tell application "${escapedBrowserName}"
        activate
      end tell
      tell application "System Events"
        keystroke "l" using command down
        keystroke "c" using command down
        delay 0.1
      end tell
      return the clipboard
    `;
  }

  try {
    return await runAppleScript(script);
  } catch (error) {
    await showFailureToast(error, {
      title: `Failed to get URL from ${browserInfo.name}`,
      message: "Make sure the browser is running and a tab is active.",
    });
    throw new Error(`Could not get URL from ${browserInfo.name}`);
  }
}

export async function openURL(url: string): Promise<void> {
  const browserInfo = await getActiveBrowserInfo();
  // Escape quotes in URL and browser name to prevent script injection
  const escapedUrl = url.replace(/"/g, '""');
  const escapedBrowserName = browserInfo.name.replace(/"/g, '""');
  const script = `tell application "${escapedBrowserName}" to open location "${escapedUrl}"`;

  try {
    await runAppleScript(script);
    // await runAppleScript(`tell application "${browserInfo.name}" to activate`);
  } catch (error) {
    await showFailureToast(error, {
      title: `Failed to open URL in ${browserInfo.name}`,
      message: "Make sure the browser is running.",
    });
    throw new Error(`Could not open URL in ${browserInfo.name}`);
  }
}

export function getBypassURL(currentURL: string): string {
  if (currentURL.includes("medium.com")) {
    return `https://freedium.cfd/${currentURL}`;
  } else {
    return `https://12ft.io/${currentURL}`;
  }
}
