import { getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";

type SupportedBrowsers = "Safari" | "Chrome" | "YouTube Music" | "Microsoft Edge";
type UrlPreference = "music" | "youtube" | "both";

/**
 * Why a tab lookup failed. Silent callers (such as the Now Playing poll) get this
 * through `onError`, because a suppressed toast would otherwise leave them unable
 * to tell a missing tab from a missing permission.
 */
export type TabError =
  | "no-tab"
  | "js-events-disabled"
  | "js-error"
  | "automation"
  | "browser-unavailable"
  | "applescript-error";

/**
 * YouTube Music pauses after a long idle period and asks whether you are still
 * listening. The renderer exists in the DOM from page load and is only made
 * visible later, so a hidden renderer must not be marked as handled: check that
 * it is visible before clicking, and unmark it if the click has no effect.
 * Installed once per page load, by every command.
 */
export const keepPlaying = `(function() {
  if (window.__ytmKeepPlayingV2) return "already";
  window.__ytmKeepPlayingV2 = true;

  function visible(el) {
    if (!el) return false;
    var rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function check() {
    var dialog = document.querySelector("ytmusic-you-there-renderer");
    if (!dialog || !visible(dialog)) {
      if (dialog) dialog.__ytmDismissedV2 = false;
      return;
    }
    if (dialog.__ytmDismissedV2) return;
    var button = dialog.querySelector("button") || dialog.querySelector("yt-button-renderer");
    if (!button || !visible(button)) return;
    dialog.__ytmDismissedV2 = true;
    button.click();
    // A click that did not close the dialog gets another attempt next pass.
    setTimeout(function() {
      if (visible(dialog)) dialog.__ytmDismissedV2 = false;
    }, 1500);
  }

  var pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    setTimeout(function() {
      pending = false;
      check();
    }, 0);
  }

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style", "aria-hidden", "hidden", "opened"]
  });
  setInterval(check, 1000);
  check();
  return "installed";
})();`;

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

function appleScriptErrorMessage(error: unknown): string {
  return (error as { stderr?: string })?.stderr || (error as { message?: string })?.message || String(error);
}

function classifyAppleScriptError(error: unknown): TabError {
  const message = appleScriptErrorMessage(error);

  if (message.includes("Allow JavaScript from Apple Events")) return "js-events-disabled";
  if (
    message.includes("not allowed to send") ||
    message.includes("not allowed assistive") ||
    message.includes("privacy")
  ) {
    return "automation";
  }
  if (message.includes("can't get window") || message.includes("not running")) return "browser-unavailable";
  return "applescript-error";
}

/**
 * Handles AppleScript errors by extracting the error message and showing an appropriate toast.
 */
function handleAppleScriptError(error: unknown, browserName: string): void {
  switch (classifyAppleScriptError(error)) {
    case "js-events-disabled":
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

    case "automation":
      showToast({
        title: "Automation Permission Needed",
        message: `macOS blocked the script from controlling ${browserName}. Check System Settings → Privacy & Security → Automation.`,
        style: Toast.Style.Failure,
      });
      return;

    case "browser-unavailable":
      showToast({
        title: "Browser Not Available",
        message: `${browserName} doesn't appear to be running or doesn't support AppleScript.`,
        style: Toast.Style.Failure,
      });
      return;

    default:
      showToast({
        title: "AppleScript Execution Failed",
        message: appleScriptErrorMessage(error).slice(0, 200),
        style: Toast.Style.Failure,
      });
  }
}

/**
 * Executes JavaScript inside a matching YouTube or YouTube Music tab in the selected browser.
 */
export async function runJSInYouTubeMusicTab(
  code: string,
  options?: { silent?: boolean; musicOnly?: boolean; onError?: (reason: TabError) => void }
): Promise<string | undefined> {
  const preferences = getPreferenceValues<Preferences>();
  const { browser, urlPreference } = preferences;
  const { silent = false, musicOnly = false, onError } = options ?? {};
  // `browser` is required in the manifest, but the generated type is optional.
  if (!browser) {
    if (!silent) {
      showToast({
        title: "Browser Not Set",
        message: "Choose a browser in the extension preferences.",
        style: Toast.Style.Failure,
      });
    }
    onError?.("browser-unavailable");
    return undefined;
  }
  // Commands that read the music player must not fall through to a regular
  // YouTube tab when the user prefers "Both" or "YouTube".
  const condition = musicOnly ? 'URL contains "music.youtube.com"' : getUrlCondition(urlPreference);
  // Install the idle-prompt watcher on every command; it is idempotent and
  // returns before running its own check on later calls.
  const script = `${keepPlaying}\n${code}`;

  let result: string;
  try {
    result = await runAppleScript(`
      if not (application "${browser.name}" is running) then
        return "browser-not-running"
      end if
      tell application "${browser.name}"
        repeat with w in (every window)
          repeat with t in (every tab whose ${condition}) of w
            tell t
              try
                return ${runJS(browser.name, script)}
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
    if (!silent) handleAppleScriptError(error, browser.name);
    onError?.(classifyAppleScriptError(error));
    return undefined;
  }

  if (result === "browser-not-running") {
    if (!silent) {
      showToast({
        title: "Browser Not Available",
        message: `${browser.name} doesn't appear to be running.`,
        style: Toast.Style.Failure,
      });
    }
    onError?.("browser-unavailable");
    return undefined;
  }

  if (result.includes("Allow JavaScript from Apple Events")) {
    if (!silent) {
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
    }
    onError?.("js-events-disabled");
    return undefined;
  }

  if (result.includes("JS Error")) {
    if (!silent) {
      showToast({
        title: "JavaScript Error",
        message: result.split("JS Error: ")[1],
        style: Toast.Style.Failure,
      });
    }
    onError?.("js-error");
    return undefined;
  }

  if (result === "no-matching-tab") {
    if (!silent) {
      showToast({
        title: "No matching tab found",
        message: "Please open a YouTube or YouTube Music tab in the selected browser",
        style: Toast.Style.Failure,
      });
    }
    onError?.("no-tab");
    return undefined;
  }

  return result;
}

/**
 * Opens a URL in the browser selected in the extension preferences. Unlike
 * `runJSInYouTubeMusicTab`, this is intentionally allowed to launch the browser.
 */
export async function openInSelectedBrowser(url: string): Promise<void> {
  const { browser } = getPreferenceValues<Preferences>();
  if (!browser) {
    await showToast({
      title: "Browser Not Set",
      message: "Choose a browser in the extension preferences.",
      style: Toast.Style.Failure,
    });
    return;
  }

  try {
    await runAppleScript(`
      tell application "${browser.name}"
        activate
        open location "${escapeJS(url)}"
      end tell
    `);
  } catch (error) {
    handleAppleScriptError(error, browser.name);
  }
}
