import { Clipboard, getSelectedText } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";

const urlRegex = /(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/;

interface BrowserInfo {
  engine: "webkit" | "chromium" | "gecko";
}

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

function isUrl(text: string): boolean {
  return urlRegex.test(text);
}

export async function getUrl(urlArgument: string | undefined): Promise<string | Error> {
  let url: string | undefined;

  if (urlArgument) {
    // If the user has provided a URL, use that
    url = urlArgument;
  } else {
    try {
      // If the user has selected text, use that as the URL
      url = await getSelectedText();
    } catch {
      // Otherwise, use the clipboard
      url = await Clipboard.readText();
    }
  }

  if (!url) {
    return new Error("No URL provided.");
  }

  if (!isUrl(url)) {
    return new Error(`Invalid URL: "${url}"`);
  }

  return url.trim();
}

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
    return { name: frontmostAppName, engine: "chromium" };
  }
}

export async function getCurrentTabURL(): Promise<string> {
  const browserInfo = await getActiveBrowserInfo();
  const escapedBrowserName = browserInfo.name.replace(/"/g, '""');

  let script = "";
  if (browserInfo.engine === "webkit") {
    script = `tell application "${escapedBrowserName}" to return URL of current tab of front window`;
  } else if (browserInfo.engine === "chromium") {
    script = `tell application "${escapedBrowserName}" to return URL of active tab of front window`;
  } else if (browserInfo.engine === "gecko") {
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
  const escapedUrl = url.replace(/"/g, '""');
  const escapedBrowserName = browserInfo.name.replace(/"/g, '""');
  const script = `tell application "${escapedBrowserName}" to open location "${escapedUrl}"`;

  try {
    await runAppleScript(script);
  } catch (error) {
    await showFailureToast(error, {
      title: `Failed to open URL in ${browserInfo.name}`,
      message: "Make sure the browser is running.",
    });
    throw new Error(`Could not open URL in ${browserInfo.name}`);
  }
}

export function getRemovePaywallURL(currentURL: string, userPreferredService?: string): string {
  if (currentURL.includes("medium.com")) {
    return `https://freedium.cfd/${currentURL}`;
  } else {
    if (!userPreferredService?.startsWith("https://")) {
      throw new Error("Preferred service must start with https://");
    }
    return `${userPreferredService}/${currentURL}`;
  }
}
