import { getPreferenceValues, showHUD } from "@raycast/api";
import { execSync } from "child_process";

interface Preferences {
  defaultBrowser: string;
  showToastMessages: boolean;
}

// Map of supported browser bundle IDs to their application names
const SUPPORTED_BROWSERS: Record<string, string> = {
  "com.google.chrome": "Google Chrome",
  "com.microsoft.edgemac": "Microsoft Edge",
  "com.brave.browser": "Brave Browser",
  "com.vivaldi.vivaldi": "Vivaldi",
  "com.operasoftware.opera": "Opera",
  "org.chromium.chromium": "Chromium",
  "com.apple.safari": "Safari",
};

const FALLBACK_BROWSER = "Google Chrome";

/**
 * Auto-detects the default browser's application name.
 * Falls back to Google Chrome if no supported browser is detected.
 */
const autoDetectBrowser = (): string => {
  try {
    // Get the default browser bundle ID using macOS defaults command
    const bundleId = execSync(
      `defaults read ~/Library/Preferences/com.apple.LaunchServices/com.apple.launchservices.secure LSHandlers | grep -B1 "https" | grep "LSHandlerRoleAll" | head -1 | sed 's/.*= "\\(.*\\)";/\\1/'`,
      { encoding: "utf-8", timeout: 2000 },
    ).trim();

    if (bundleId && SUPPORTED_BROWSERS[bundleId.toLowerCase()]) {
      return SUPPORTED_BROWSERS[bundleId.toLowerCase()];
    }

    // Fallback: try alternative method using URL scheme
    const altBundleId = execSync(
      `defaults read com.apple.LaunchServices/com.apple.launchservices.secure LSHandlers 2>/dev/null | grep -A2 "LSHandlerURLScheme = https" | grep LSHandlerRoleAll | sed 's/.*= "\\(.*\\)";/\\1/' | head -1`,
      { encoding: "utf-8", timeout: 2000 },
    ).trim();

    if (altBundleId && SUPPORTED_BROWSERS[altBundleId.toLowerCase()]) {
      return SUPPORTED_BROWSERS[altBundleId.toLowerCase()];
    }

    return FALLBACK_BROWSER;
  } catch {
    return FALLBACK_BROWSER;
  }
};

/**
 * Gets the browser to use based on user preferences.
 * If set to "auto", detects the system default browser.
 */
const getBrowser = (preferences: Preferences): string => {
  if (preferences.defaultBrowser === "auto") {
    return autoDetectBrowser();
  }
  return preferences.defaultBrowser;
};

interface CycleResult {
  success: boolean;
  browserName: string;
  action?: "switched" | "launched" | "new_window" | "single";
}

/**
 * Uses JXA to cycle to the next browser window.
 * If browser is not running, launches it.
 * If no windows exist, opens a new window.
 * Otherwise, takes the last window and brings it to the front.
 */
const cycleToNextWindow = (browserName: string): CycleResult => {
  const jxaScript = `
    (() => {
      const browser = Application("${browserName}");
      const SystemEvents = Application("System Events");

      // Check if browser is running
      if (!browser.running()) {
        browser.activate();
        return JSON.stringify({ success: true, action: "launched" });
      }

      const windows = browser.windows();

      // No windows open - create a new one
      if (windows.length === 0) {
        browser.activate();
        // Use System Events to send Cmd+N for new window
        delay(0.3);
        SystemEvents.keystroke("n", { using: "command down" });
        return JSON.stringify({ success: true, action: "new_window" });
      }

      // Only one window - just activate it
      if (windows.length === 1) {
        browser.activate();
        return JSON.stringify({ success: true, action: "single" });
      }

      // Multiple windows - cycle to next
      const lastWindow = windows[windows.length - 1];
      lastWindow.index = 1;
      browser.activate();

      return JSON.stringify({ success: true, action: "switched" });
    })()
  `;

  try {
    const result = execSync(`osascript -l JavaScript -e '${jxaScript}'`, {
      encoding: "utf-8",
      timeout: 5000,
    }).trim();

    const parsed = JSON.parse(result);
    return { ...parsed, browserName };
  } catch {
    return { success: false, browserName };
  }
};

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const browserName = getBrowser(preferences);
  const result = cycleToNextWindow(browserName);

  if (!preferences.showToastMessages) {
    return;
  }

  if (!result.success) {
    await showHUD(`Failed to control ${browserName}`);
    return;
  }

  const messages: Record<string, string> = {
    launched: `Launched ${browserName}`,
    new_window: `Opened new ${browserName} window`,
    single: `Only one ${browserName} window open`,
    switched: `Switched profile`,
  };

  const message = result.action ? messages[result.action] : "Switched profile";
  await showHUD(message);
}
