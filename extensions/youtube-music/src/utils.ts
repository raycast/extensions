import {
  Application,
  getPreferenceValues,
  open,
  openExtensionPreferences,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { runAppleScript } from "run-applescript";

type SupportedBrowsers = "Safari" | "Chrome" | "YouTube Music" | "Microsoft Edge";
type UrlPreference = "music" | "youtube" | "both";

interface Preferences {
  browser: Application;
  urlPreference: UrlPreference;
}

/**
 * Escapes JavaScript so it can safely be inserted into AppleScript.
 */
function escapeJS(js: string): string {
  return js
    .replace(/\\/g, "\\\\") // escape backslashes
    .replace(/"/g, '\\"') // escape double quotes
    .replace(/\n/g, "\\n"); // escape newlines
}

/**
 * Generates the AppleScript command to run JavaScript in a browser tab.
 */
function runJS(browser: SupportedBrowsers | string, code: string): string {
  const escaped = escapeJS(code);
  return browser === "Safari" ? `do javascript "${escaped}"` : `execute javascript "${escaped}"`;
}

/**
 * Returns the URL-matching AppleScript condition based on user preferences.
 */
function getUrlCondition(preference: UrlPreference): string {
  switch (preference) {
    case "music":
      return 'URL contains "music.youtube.com"';
    case "youtube":
      return 'URL contains "youtube.com" and URL does not contain "music.youtube.com"';
    case "both":
      return '(URL contains "music.youtube.com" or (URL contains "youtube.com" and URL does not contain "music.youtube.com"))';
    default:
      return 'URL contains "music.youtube.com"';
  }
}

/**
 * Executes JavaScript inside a matching YouTube or YouTube Music tab in the selected browser.
 */
export async function runJSInYouTubeMusicTab(code: string): Promise<string | undefined> {
  const preferences = getPreferenceValues<Preferences>();
  const { browser, urlPreference } = preferences;

  const result = await runAppleScript(`
      tell application "${browser.name}"
        repeat with w in (every window)
          repeat with t in (every tab whose ${getUrlCondition(urlPreference)}) of w
            tell t
              try
                return ${runJS(browser.name, code)}
              on error errMsg
                return "JS Error: " & errMsg
              end try
            end tell
          end repeat
        end repeat
      end tell
      return "no-matching-tab"
    `);

  if (result.includes("Allow JavaScript from Apple Events")) {
    showToast({
      title: "Enable JavaScript from Apple Events",
      message: 'Please enable "Allow JavaScript from Apple Events" in your browser\'s Develop menu.',
      style: Toast.Style.Failure,
      primaryAction: {
        onAction: () => {
          open("https://www.raycast.com/danieldbird/youtube-music");
        },
        title: "🔗 How to enable JavaScript from Apple Events",
      },
    });
    throw new Error('⚠️ Enable "Allow JavaScript from Apple Events" in your browser\'s Develop menu.');
  }

  if (result.includes("JS Error")) {
    showToast({
      title: "JavaScript Error",
      message: result.split("JS Error: ")[1],
      style: Toast.Style.Failure,
    });
    throw new Error(result.split("JS Error: ")[1]);
  }

  if (result === "no-matching-tab") {
    showToast({
      title: "No matching tab found",
      message: "Please open a YouTube or YouTube Music tab in the selected browser",
      style: Toast.Style.Failure,
    });
    throw new Error("No matching tab found");
  }

  return result;
}
