import { Clipboard, getPreferenceValues, open, showHUD, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

const TELEMOST_URL = "https://telemost.yandex.ru";
const MEETING_PATH_PREFIX = "/j/";
const MEETING_RESULT_PREFIX = "meeting:";

// Single JS payload: detects success URL or clicks the create button.
// Returns "meeting:<url>" if the tab already shows a meeting, "clicked", or "waiting".
const CHECK_AND_CLICK_JS = `
(function() {
  if (location.pathname.indexOf('${MEETING_PATH_PREFIX}') === 0) {
    return '${MEETING_RESULT_PREFIX}' + location.href;
  }
  var all = Array.from(document.querySelectorAll('button, a, [role="button"]'));
  var btn = all.find(function(el) {
    return el.innerText && el.innerText.trim().indexOf('Создать') === 0;
  });
  if (btn) { btn.click(); return 'clicked'; }
  return 'waiting';
})()
`.trim();

type BrowserFamily = "chromium" | "safari";

// Known Safari-family apps; everything else defaults to Chromium syntax (covers 95%+ of browsers)
const SAFARI_FAMILY = new Set(["Safari", "Safari Technology Preview"]);

function detectBrowserFamily(browser: string): BrowserFamily {
  return SAFARI_FAMILY.has(browser) ? "safari" : "chromium";
}

function escapeForAppleScript(js: string): string {
  return js.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ");
}

function getRunJsScript(browser: string, family: BrowserFamily, js: string): string {
  const escaped = escapeForAppleScript(js);
  if (family === "safari") {
    return `tell application "${browser}" to return (do JavaScript "${escaped}" in current tab of front window) as string`;
  }
  return `tell application "${browser}" to return (execute active tab of front window javascript "${escaped}") as string`;
}

async function getFrontmostApp(): Promise<string> {
  return (
    await runAppleScript(`
    tell application "System Events"
      return name of first application process whose frontmost is true
    end tell
  `)
  ).trim();
}

async function refocusApp(appName: string): Promise<void> {
  await runAppleScript(`
    tell application "System Events"
      set frontmost of first application process whose name is "${appName}" to true
    end tell
  `);
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export async function createMeeting(refocus: boolean): Promise<void> {
  const { browser: preferredBrowserApp } = getPreferenceValues<Preferences>();

  // Save the app to return to before opening the browser.
  // Skip if Raycast itself is frontmost — refocusing Raycast (which is already closed) is a no-op
  // and would not restore the user's actual previous context.
  let previousApp: string | null = null;
  if (refocus) {
    const frontmost = await getFrontmostApp();
    if (frontmost && frontmost !== "Raycast") {
      previousApp = frontmost;
    }
  }

  const toast = await showToast({ style: Toast.Style.Animated, title: "Opening Telemost…" });

  // Pass the Application object directly so Raycast uses the correct app
  await open(TELEMOST_URL, preferredBrowserApp ?? undefined);

  // For AppleScript we need the app name — use the configured browser when available,
  // otherwise detect from frontmost after a short wait for the browser to come to front
  let browser: string;
  if (preferredBrowserApp?.name) {
    browser = preferredBrowserApp.name;
  } else {
    await sleep(500);
    browser = await getFrontmostApp();
  }
  const family = detectBrowserFamily(browser);

  toast.message = "Creating meeting…";

  // Unified polling loop: each iteration either detects the meeting URL or
  // clicks the create button. Handles every state in one AppleScript call.
  const deadline = Date.now() + 30_000;
  let clicked = false;

  // Track the initial /j/ URL (if any) so we can ignore it — it represents a meeting
  // the user already had open, not the one we're creating now.
  let staleUrl: string | null = null;

  while (Date.now() < deadline) {
    try {
      const result = (await runAppleScript(getRunJsScript(browser, family, CHECK_AND_CLICK_JS))).trim();

      if (result.startsWith(MEETING_RESULT_PREFIX)) {
        const url = result.slice(MEETING_RESULT_PREFIX.length);
        // Accept only if we either clicked the button or the URL changed from the stale one.
        // Otherwise this is just a pre-existing meeting tab we shouldn't claim as ours.
        if (clicked || (staleUrl !== null && url !== staleUrl)) {
          await Promise.all([
            Clipboard.copy(url),
            previousApp ? refocusApp(previousApp).catch(() => undefined) : Promise.resolve(),
          ]);
          await showHUD("✓ Meeting created — URL copied to clipboard");
          return;
        }
        if (staleUrl === null) {
          staleUrl = url;
        }
      } else if (result === "clicked" && !clicked) {
        clicked = true;
        toast.title = "Waiting for meeting…";
      }
    } catch (e) {
      const msg = String(e);
      if (
        msg.includes("AppleScript is turned off") ||
        msg.includes("JavaScript from Apple Events") ||
        msg.includes("must enable")
      ) {
        const instruction =
          family === "safari"
            ? `Safari Settings → Advanced → enable "Show features for web developers", then Develop → Allow JavaScript from Apple Events`
            : `${browser}: View → Developer → Allow JavaScript from Apple Events, then restart ${browser}`;
        toast.style = Toast.Style.Failure;
        toast.title = "Enable JavaScript from Apple Events";
        toast.message = instruction;
        toast.primaryAction = { title: "Got it", onAction: () => toast.hide() };
        return;
      }
      if (msg.includes("isn't going to do it") || msg.includes("doesn't understand") || msg.includes("Expected end")) {
        toast.style = Toast.Style.Failure;
        toast.title = "Browser not supported";
        toast.message = `"${browser}" doesn't support the required AppleScript commands.`;
        return;
      }
      // Other errors (page not ready, etc.) — keep polling
    }
    await sleep(300);
  }

  toast.style = Toast.Style.Failure;
  toast.title = "Timeout";
  toast.message = clicked
    ? "Couldn't detect meeting URL — copy it manually"
    : "Couldn't find the create-meeting button — click it manually";
}
