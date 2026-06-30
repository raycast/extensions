import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type BrowserTabInfo = {
  url: string;
  title: string;
  browser: string;
};

export class BrowserTabError extends Error {
  constructor(
    message: string,
    public readonly kind: "unsupported" | "empty" | "failed" = "failed",
  ) {
    super(message);
    this.name = "BrowserTabError";
  }
}

function parseResult(raw: string): BrowserTabInfo {
  const parts = raw.trim().split("|||");
  const url = parts[0]?.trim() ?? "";
  const title = parts[1]?.trim() ?? "";
  const browser = parts[2]?.trim() ?? "Browser";
  if (!url || url === "missing value") {
    throw new BrowserTabError("The active tab has no URL (empty or new tab).", "empty");
  }
  return { url, title, browser };
}

async function runOsascript(script: string): Promise<string> {
  const { stdout, stderr } = await execFileAsync("/usr/bin/osascript", ["-e", script], {
    maxBuffer: 2 * 1024 * 1024,
    timeout: 15_000,
  });
  if (stderr && /execution error/i.test(stderr)) {
    throw new Error(stderr.trim());
  }
  return stdout;
}

/** Chromium-family: URL + title from active tab */
function chromiumScript(appName: string): string {
  return `
tell application "${appName}"
  if (count of windows) is 0 then error "No window"
  set pageUrl to URL of active tab of front window
  set pageTitle to title of active tab of front window
  return pageUrl & "|||" & pageTitle & "|||${appName}"
end tell
`.trim();
}

const safariScript = `
tell application "Safari"
  if (count of windows) is 0 then error "No window"
  tell front window
    set currentTab to current tab
    set pageUrl to URL of currentTab
    set pageTitle to name of currentTab
  end tell
  return pageUrl & "|||" & pageTitle & "|||Safari"
end tell
`.trim();

/** Order: fallback when Raycast (or another app) is frontmost — try common browsers. */
const browserHandlers: Array<{ match: (name: string) => boolean; script: () => string }> = [
  { match: (n) => n === "Google Chrome", script: () => chromiumScript("Google Chrome") },
  { match: (n) => n === "Safari", script: () => safariScript },
  { match: (n) => n === "Arc", script: () => chromiumScript("Arc") },
  { match: (n) => n === "Dia", script: () => chromiumScript("Dia") },
  { match: (n) => n === "Brave Browser", script: () => chromiumScript("Brave Browser") },
  { match: (n) => n === "Microsoft Edge", script: () => chromiumScript("Microsoft Edge") },
  { match: (n) => n === "Chromium", script: () => chromiumScript("Chromium") },
  { match: (n) => n === "Opera", script: () => chromiumScript("Opera") },
  { match: (n) => n === "Vivaldi", script: () => chromiumScript("Vivaldi") },
];

async function frontmostAppName(): Promise<string> {
  const script = `tell application "System Events" to return name of first application process whose frontmost is true`;
  return (await runOsascript(script)).trim();
}

async function tryReadTab(h: (typeof browserHandlers)[0]): Promise<BrowserTabInfo | null> {
  try {
    const raw = await runOsascript(h.script());
    return parseResult(raw);
  } catch {
    return null;
  }
}

/**
 * Reads URL and title of a browser tab. Tries the frontmost app if it is a supported browser,
 * otherwise tries Chrome → Safari → Arc → … until one has an open window (works after opening Raycast).
 */
export async function getActiveBrowserTab(): Promise<BrowserTabInfo> {
  let appName = "";
  try {
    appName = await frontmostAppName();
  } catch {
    /* continue with fallback only */
  }

  if (appName) {
    const direct = browserHandlers.find((h) => h.match(appName));
    if (direct) {
      const tab = await tryReadTab(direct);
      if (tab) {
        return tab;
      }
    }
  }

  for (const h of browserHandlers) {
    const tab = await tryReadTab(h);
    if (tab) {
      return tab;
    }
  }

  throw new BrowserTabError(
    "No supported browser with an open tab was found. Open a page in Chrome, Safari, Arc, Dia, Brave, Edge, Opera, or Vivaldi.",
    "unsupported",
  );
}
