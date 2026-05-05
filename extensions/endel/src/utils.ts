import { getPreferenceValues, showToast, Toast, open } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

const preferences = getPreferenceValues<Preferences>();
type SupportedBrowsers = "Safari" | "Chrome" | "Microsoft Edge" | "Arc" | "Brave Browser";

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
 * Executes JavaScript inside the Endel tab in the selected browser.
 */
async function runJSInEndelTab(code: string): Promise<string | false> {
  const { browser } = preferences;

  try {
    const result = await runAppleScript(`
      tell application "${browser?.name}"
        repeat with w in (every window)
          repeat with t in (every tab whose URL contains "app.endel.io") of w
            tell t
              try
                return ${runJS(browser?.name || "", code)}
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
        title: "No Endel tab found",
        message: "Make sure Endel is open in " + browser?.name,
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
        message: `Enable "Allow JavaScript from Apple Events" in ${browser?.name}'s Develop menu.`,
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

export async function openEndel(soundscape: string): Promise<void> {
  const url = `https://app.endel.io/player/${soundscape}`;

  // Open the URL in the selected browser
  await open(url, preferences.browser);

  if (preferences.autoplay && preferences.browser) {
    // Wait for the page to load
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Simple JavaScript to click the play button
    await runJSInEndelTab(`
      (function() {
        const button = document.querySelector('footer div[class*="Controls"] button:first-child');
        if (button && !button.getAttribute('aria-label')?.toLowerCase().includes('pause')) {
          button.click();
          return 'clicked';
        }
        return 'already playing or button not found';
      })();
    `);
  }
}
