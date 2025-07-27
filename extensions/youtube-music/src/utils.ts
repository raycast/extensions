import { Application, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { runAppleScript } from "run-applescript";

type SupportedBrowsers = "Safari" | "Chrome" | "YouTube Music" | "Microsoft Edge";
type UrlPreference = "music" | "youtube" | "both";

interface Preferences {
  browser: Application;
  urlPreference: UrlPreference;
}

interface OsaError {
  stderr: string;
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
export async function runJSInYouTubeMusicTab(code: string): Promise<string | false> {
  const preferences = getPreferenceValues<Preferences>();
  const { browser, urlPreference } = preferences;

  try {
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
      return "false"
    `);

    if (result === "false") {
      await showToast({
        style: Toast.Style.Failure,
        title: "No matching YouTube tab found",
        message: "Check your browser and URL preference in settings.",
      });
      return false;
    }

    return result;
  } catch (e) {
    const message = (e as OsaError).stderr;

    if (message.includes("Allow JavaScript from Apple Events")) {
      await showToast({
        style: Toast.Style.Failure,
        title: "JavaScript not allowed",
        message: `Enable "Allow JavaScript from Apple Events" in ${browser.name}'s Develop menu.`,
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "AppleScript execution failed",
        message,
      });
    }

    return false;
  }
}

export const goToChapter = {
  next: `(function() {
    const activeChapter = document.querySelector('ytd-macro-markers-list-item-renderer[active]');
    const nextChapter = activeChapter?.nextElementSibling;
    nextChapter?.querySelector('a')?.click();
  })();`,
  previous: `(function(){
    const activeChapter = document.querySelector('ytd-macro-markers-list-item-renderer[active]');
    const previousChapter = activeChapter?.previousElementSibling;
    previousChapter?.querySelector('a')?.click();
  })();`,
};
