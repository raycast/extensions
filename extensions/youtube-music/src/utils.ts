import { Application, getPreferenceValues, open, showToast, Toast } from "@raycast/api";
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
 * Handles AppleScript errors by extracting the error message and showing an appropriate toast.
 */
function handleAppleScriptError(error: unknown, browserName: string): void {
  const message = (error as { stderr?: string })?.stderr || (error as { message?: string })?.message || String(error);

  if (message.includes("Allow JavaScript from Apple Events")) {
    showToast({
      title: "Enable JavaScript from Apple Events",
      message: `Please enable "Allow JavaScript from Apple Events" in ${browserName}'s Develop menu.`,
      style: Toast.Style.Failure,
      primaryAction: {
        onAction: () => {
          open("https://www.raycast.com/danieldbird/youtube-music");
        },
        title: "🔗 How to enable JavaScript from Apple Events",
      },
    });
    return;
  }

  if (
    message.includes("not allowed to send") ||
    message.includes("not allowed assistive") ||
    message.includes("privacy")
  ) {
    showToast({
      title: "Automation Permission Needed",
      message: `macOS blocked the script from controlling ${browserName}. Check System Settings → Privacy & Security → Automation.`,
      style: Toast.Style.Failure,
    });
    return;
  }

  if (message.includes("can't get window") || message.includes("not running")) {
    showToast({
      title: "Browser Not Available",
      message: `${browserName} doesn't appear to be running or doesn't support AppleScript.`,
      style: Toast.Style.Failure,
    });
    return;
  }

  showToast({
    title: "AppleScript Execution Failed",
    message: message.slice(0, 200),
    style: Toast.Style.Failure,
  });
}

/**
 * Executes JavaScript inside a matching YouTube or YouTube Music tab in the selected browser.
 */
export async function runJSInYouTubeMusicTab(code: string): Promise<string | undefined> {
  const preferences = getPreferenceValues<Preferences>();
  const { browser, urlPreference } = preferences;

  let result: string;
  try {
    result = await runAppleScript(`
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
  } catch (error) {
    handleAppleScriptError(error, browser.name);
    return undefined;
  }

  if (result.includes("Allow JavaScript from Apple Events")) {
    showToast({
      title: "Enable JavaScript from Apple Events",
      message: `Please enable "Allow JavaScript from Apple Events" in ${browser.name}'s Develop menu.`,
      style: Toast.Style.Failure,
      primaryAction: {
        onAction: () => {
          open("https://www.raycast.com/danieldbird/youtube-music");
        },
        title: "🔗 How to enable JavaScript from Apple Events",
      },
    });
    return undefined;
  }

  if (result.includes("JS Error")) {
    showToast({
      title: "JavaScript Error",
      message: result.split("JS Error: ")[1],
      style: Toast.Style.Failure,
    });
    return undefined;
  }

  if (result === "no-matching-tab") {
    showToast({
      title: "No matching tab found",
      message: "Please open a YouTube or YouTube Music tab in the selected browser",
      style: Toast.Style.Failure,
    });
    return undefined;
  }

  return result;
}
