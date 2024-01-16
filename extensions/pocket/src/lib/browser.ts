import { runAppleScript } from "@raycast/utils";

const supportedBrowsers = ["com.google.Chrome", "com.apple.Safari", "company.thebrowser.Browser"] as const;

type Browser = (typeof supportedBrowsers)[number];

export function isSupportedBrowser(browser?: string): browser is Browser {
  return supportedBrowsers.some((b) => b === browser);
}

export async function getCurrentTab(browser: Browser) {
  switch (browser) {
    case "company.thebrowser.Browser":
      return runAppleScript(`tell application "Arc" to return URL of active tab of front window`);
    case "com.google.Chrome":
      return runAppleScript(`tell application "Google Chrome" to return URL of active tab of front window`);
    case "com.apple.Safari":
      return runAppleScript(`tell application "Safari" to return URL of front document`);
    default:
      throw new Error(`Unsupported browser app: ${browser}`);
  }
}
