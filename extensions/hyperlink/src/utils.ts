import { getPreferenceValues } from "@raycast/api";
import { exec } from "child_process";
import util from "util";
import { DEBUG_MODE } from "./settings";

const execAsync = util.promisify(exec);

const preferences = getPreferenceValues<{
  customBrowser?: { name: string; bundleId: string; path: string };
}>();

const BROWSERS = [
  "Safari",
  "Google Chrome",
  "Firefox",
  "Microsoft Edge",
  "Brave Browser",
  "Vivaldi",
  "Arc Browser",
  "Opera",
  "Zen Browser",
];

export async function getActiveBrowser(): Promise<{
  name: string | null;
  isFocused: boolean;
}> {
  try {
    const { stdout: activeApp } = await execAsync(
      "osascript -e 'tell application \"System Events\" to get name of first process whose frontmost is true'",
    );

    const focusedBrowser = activeApp.trim();
    if (DEBUG_MODE)
      console.log("🧐 DEBUG: Focused application detected:", focusedBrowser);

    if (BROWSERS.includes(focusedBrowser)) {
      return { name: focusedBrowser, isFocused: true };
    }

    for (const browser of BROWSERS) {
      try {
        const { stdout: isRunning } = await execAsync(
          `osascript -e 'tell application "System Events" to count (every process whose name is "${browser}")'`,
        );

        if (isRunning.trim() !== "0") {
          return { name: browser, isFocused: false };
        }
      } catch (error) {
        console.error(error);
        continue;
      }
    }

    if (preferences.customBrowser?.name) {
      const customBrowserName = preferences.customBrowser.name;
      if (DEBUG_MODE)
        console.log(`🧐 DEBUG: Using custom browser: ${customBrowserName}`);

      if (customBrowserName === focusedBrowser) {
        if (DEBUG_MODE)
          console.log(
            `✅ DEBUG: Custom browser ${customBrowserName} is also focused!`,
          );
        return { name: customBrowserName, isFocused: true };
      }

      return { name: customBrowserName, isFocused: false };
    }

    if (DEBUG_MODE)
      console.log("❌ DEBUG: No active or open browser detected!");
    return { name: null, isFocused: false };
  } catch (error) {
    if (DEBUG_MODE)
      console.log("❌ DEBUG: Error detecting active browser!", error);
    return { name: null, isFocused: false };
  }
}

export async function getCurrentTabURL(
  browser: string,
): Promise<string | null> {
  try {
    let script = "";

    const chromiumBrowsers = [
      "Google Chrome",
      "Brave Browser",
      "Vivaldi",
      "Arc Browser",
      "Opera",
      "Zen Browser",
    ];

    if (chromiumBrowsers.includes(browser)) {
      script = `tell application "${browser}" to return URL of active tab of front window`;
    } else if (browser === "Safari") {
      script = `tell application "Safari" to return URL of front document`;
    } else if (browser === "Firefox" || browser === "Microsoft Edge") {
      script = `tell application "${browser}" to activate
                tell application "System Events" to keystroke "l" using command down
                delay 0.1
                tell application "System Events" to keystroke "c" using command down
                delay 0.1
                return the clipboard`;
    } else {
      if (DEBUG_MODE)
        console.log(
          `⚠️ DEBUG: Unknown browser (${browser}) detected. Using clipboard method.`,
        );
      return await execAsync("osascript -e 'get the clipboard'").then(
        ({ stdout }) => stdout.trim() || null,
      );
    }

    if (DEBUG_MODE)
      console.log(`🧐 DEBUG: Running AppleScript for ${browser}:\n${script}`);

    const { stdout: url } = await execAsync(`osascript -e '${script}'`);

    if (!url.trim()) {
      if (DEBUG_MODE)
        console.log(
          `❌ DEBUG: No URL retrieved for ${browser}, trying clipboard method...`,
        );
      return await execAsync("osascript -e 'get the clipboard'").then(
        ({ stdout }) => stdout.trim() || null,
      );
    }

    if (DEBUG_MODE) console.log(`✅ DEBUG: URL retrieved: ${url.trim()}`);
    return url.trim();
  } catch (error) {
    if (DEBUG_MODE)
      console.log(`❌ DEBUG: Error retrieving URL from ${browser}:`, error);

    try {
      const { stdout: clipboardUrl } = await execAsync(
        "osascript -e 'get the clipboard'",
      );
      return clipboardUrl.trim() || null;
    } catch (clipboardError) {
      if (DEBUG_MODE)
        console.log(`❌ DEBUG: Clipboard method also failed:`, clipboardError);
      return null;
    }
  }
}
