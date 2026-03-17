import { Application } from "@raycast/api";

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const BROWSER_TAB_SEPARATOR = "|||RAYCAST_TAB|||";

type BrowserScriptType = "chromium" | "safari";

interface BrowserSpec {
  names: string[];
  bundleIds: string[];
  applicationId: string;
  script: BrowserScriptType;
}

const SUPPORTED_BROWSERS: BrowserSpec[] = [
  {
    names: ["Arc"],
    bundleIds: ["company.thebrowser.Browser"],
    applicationId: "company.thebrowser.Browser",
    script: "chromium",
  },
  {
    names: ["Google Chrome"],
    bundleIds: ["com.google.Chrome"],
    applicationId: "com.google.Chrome",
    script: "chromium",
  },
  {
    names: ["Google Chrome Canary"],
    bundleIds: ["com.google.Chrome.canary"],
    applicationId: "com.google.Chrome.canary",
    script: "chromium",
  },
  {
    names: ["Brave Browser"],
    bundleIds: ["com.brave.Browser"],
    applicationId: "com.brave.Browser",
    script: "chromium",
  },
  {
    names: ["Microsoft Edge"],
    bundleIds: ["com.microsoft.edgemac"],
    applicationId: "com.microsoft.edgemac",
    script: "chromium",
  },
  {
    names: ["Safari"],
    bundleIds: ["com.apple.Safari"],
    applicationId: "com.apple.Safari",
    script: "safari",
  },
  {
    names: ["Safari Technology Preview"],
    bundleIds: ["com.apple.SafariTechnologyPreview"],
    applicationId: "com.apple.SafariTechnologyPreview",
    script: "safari",
  },
];

function getSupportedBrowser(
  frontmostApplication: Application,
): BrowserSpec | undefined {
  return SUPPORTED_BROWSERS.find((browser) => {
    return (
      browser.bundleIds.includes(frontmostApplication.bundleId ?? "") ||
      browser.names.includes(frontmostApplication.name)
    );
  });
}

export function isSupportedBrowser(frontmostApplication: Application): boolean {
  return Boolean(getSupportedBrowser(frontmostApplication));
}

async function runAppleScript(script: string): Promise<string> {
  const { stdout } = await execFileAsync("/usr/bin/osascript", ["-e", script]);
  return stdout.trim();
}

export interface BrowserTabInfo {
  title: string;
  url: string;
}

export async function getFrontmostBrowserTab(
  frontmostApplication: Application,
): Promise<BrowserTabInfo> {
  const browser = getSupportedBrowser(frontmostApplication);

  if (!browser) {
    throw new Error("Frontmost app is not a supported browser.");
  }

  const script =
    browser.script === "safari"
      ? `tell application id "${browser.applicationId}"
if not (exists front document) then error "No browser tab is open."
return (name of front document) & "${BROWSER_TAB_SEPARATOR}" & (URL of front document)
end tell`
      : `tell application id "${browser.applicationId}"
if (count of windows) is 0 then error "No browser window is open."
return (title of active tab of front window) & "${BROWSER_TAB_SEPARATOR}" & (URL of active tab of front window)
end tell`;

  const result = await runAppleScript(script);

  if (!result) {
    throw new Error("The browser did not return a URL.");
  }

  const [title, url] = result.split(BROWSER_TAB_SEPARATOR);

  if (!url) {
    throw new Error("The browser did not return a tab title and URL.");
  }

  return {
    title: title?.trim() ?? "",
    url: url.trim(),
  };
}
