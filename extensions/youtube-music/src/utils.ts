import { Toast, showToast } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { getPreferences } from "./infra/preference";

type SupportedBrowsers = "Safari" | "Chrome" | "YouTube Music" | "Microsoft Edge";
export type UrlPreference = "music" | "youtube" | "both";

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

async function tryRunWithCondition(browserName: string, code: string, condition: string): Promise<string | false> {
  const result = await runAppleScript(`
    tell application "${browserName}"
      repeat with w in (every window)
        repeat with t in (every tab whose ${condition}) of w
          tell t
            try
              return ${runJS(browserName, code)}
            on error errMsg
              return "JS Error: " & errMsg
            end try
          end tell
        end repeat
      end repeat
    end tell
    return "false"
  `);
  return result;
}

function runOnWantedPlatform(urlPreference: UrlPreference, browserName: string, code: string): Promise<string | false> {
  const musicCondition = 'URL contains "music.youtube.com"';
  const youtubeCondition = 'URL contains "youtube.com"';
  switch (urlPreference) {
    case "music":
      return tryRunWithCondition(browserName, code, musicCondition);
    case "youtube":
      return tryRunWithCondition(browserName, code, youtubeCondition);
    case "both":
      return (async () => {
        let result = await tryRunWithCondition(browserName, code, musicCondition);
        if (result === "false") {
          result = await tryRunWithCondition(browserName, code, youtubeCondition);
        }
        return result;
      })();
    default:
      return tryRunWithCondition(browserName, code, musicCondition);
  }
}

/**
 * Executes JavaScript inside a matching YouTube or YouTube Music tab in the selected browser.
 * In case "both" is selected, it will first try to run the code in YouTube Music tab.
 * If no YouTube Music tab is found, it will try to run the code in YouTube tab.
 */
export async function runJSInYouTubeMusicTab(code: string): Promise<string | false> {
  const { browser, urlPreference } = getPreferences();

  try {
    const result: string | false = await runOnWantedPlatform(urlPreference, browser.name, code);

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
