import { Clipboard, getPreferenceValues, open, showHUD, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

const TELEMOST_URL = "https://telemost.yandex.ru";
const MEETING_PREFIX = "https://telemost.yandex.ru/j/";

const CLICK_JS = `
(function() {
  var all = Array.from(document.querySelectorAll('button, a, [role="button"]'));
  var btn = all.find(function(el) {
    return el.innerText && el.innerText.trim().indexOf('Создать') === 0;
  });
  if (btn) { btn.click(); return 'clicked'; }
  return 'not_found';
})()
`.trim();

type BrowserFamily = "chromium" | "safari";

const BROWSERS: Record<string, BrowserFamily> = {
  "Google Chrome": "chromium",
  "Google Chrome Beta": "chromium",
  "Google Chrome Canary": "chromium",
  Chromium: "chromium",
  "Microsoft Edge": "chromium",
  "Brave Browser": "chromium",
  Opera: "chromium",
  Vivaldi: "chromium",
  Arc: "chromium",
  Dia: "chromium",
  "Zen Browser": "chromium",
  Helium: "chromium",
  Safari: "safari",
  "Safari Technology Preview": "safari",
};

function escapeForAppleScript(js: string): string {
  return js.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ");
}

function getTabUrlScript(browser: string, family: BrowserFamily): string {
  if (family === "safari") {
    return `tell application "${browser}" to return URL of current tab of front window`;
  }
  return `tell application "${browser}" to return URL of active tab of front window`;
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

  // Save the app to return to before opening the browser
  const previousApp = refocus ? await getFrontmostApp() : null;

  const toast = await showToast({ style: Toast.Style.Animated, title: "Opening Telemost…" });

  // Pass the Application object directly so Raycast uses the correct app
  await open(TELEMOST_URL, preferredBrowserApp ?? undefined);
  await sleep(2000);

  // For AppleScript we need the app name — detect from frontmost after open()
  const browser = await getFrontmostApp();
  const family = BROWSERS[browser];

  if (!family) {
    toast.style = Toast.Style.Failure;
    toast.title = "Browser not supported";
    toast.message = `"${browser}" is not supported. Change it in extension preferences.`;
    return;
  }

  toast.message = "Creating meeting…";
  try {
    const result = await runAppleScript(getRunJsScript(browser, family, CLICK_JS));
    if (result.trim() === "not_found") {
      await sleep(2000);
      await runAppleScript(getRunJsScript(browser, family, CLICK_JS));
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
    toast.message = "Click «Создать видеовстречу» manually";
  }

  toast.title = "Waiting for meeting…";
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    await sleep(600);
    try {
      const url = (await runAppleScript(getTabUrlScript(browser, family))).trim();
      if (url.startsWith(MEETING_PREFIX)) {
        await Clipboard.copy(url);
        if (previousApp) {
          await refocusApp(previousApp);
        }
        await toast.hide();
        await showHUD("✓ Meeting created — URL copied to clipboard");
        return;
      }
    } catch {
      // ignore
    }
  }

  toast.style = Toast.Style.Failure;
  toast.title = "Timeout";
  toast.message = "Couldn't detect meeting URL — copy it manually";
}
