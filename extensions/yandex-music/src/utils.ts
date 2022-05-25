import { runAppleScript } from "run-applescript";
import { Application, getPreferenceValues, showToast, Toast } from "@raycast/api";

// Extension should work with any Chromium or Firefox (not sure) based browser, but it impossible to check every such browser.
// So i cannot confirm that extension will work with any else browser except that listed below.
type SupportedBrowsers = "Safari" | "Chrome" | "Yandex" | "Microsoft Edge";

interface OsaError {
  stderr: string;
}

function runJS(browser: SupportedBrowsers | string, code: string): string {
  if (browser === "Safari") {
    return `tell t to do javascript "${code}"`;
  } else {
    return `tell t to execute javascript "${code}"`;
  }
}

export async function runJSInYandexMusicTab(code: string) {
  const browser = getPreferenceValues<{ browser: Application }>().browser;

  try {
    const tabFound =
      (await runAppleScript(`
            tell application "${browser.name}"
                repeat with w in (every window)		
                    repeat with t in (every tab whose URL contains "music.yandex.ru") of w			
                        ${runJS(browser.name, code)}
                        return true
                    end repeat	
                end repeat
            end tell
            return false
        `)) === "true";

    if (!tabFound) {
      await showToast({
        style: Toast.Style.Failure,
        title: "The Yandex Music tab hasn't been found",
        message: `Try to check selected browser in extension preferences.`,
      });
    }

    return tabFound;
  } catch (e) {
    const message = (e as OsaError).stderr;

    if (message.includes("Allow JavaScript from Apple Events")) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot run JavaScript in selected browser.",
        message: `Enable the 'Allow JavaScript from Apple Events' option in ${browser.name}'s Develop menu.`,
      });

      return false;
    }
  }
}
