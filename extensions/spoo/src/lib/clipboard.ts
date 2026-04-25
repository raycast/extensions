import { Clipboard } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

const URL_REGEX = /^https?:\/\/\S+$/i;

const APPLESCRIPT_TARGETS = [
  { app: "Google Chrome", query: "URL of active tab of front window" },
  { app: "Arc", query: "URL of active tab of front window" },
  { app: "Brave Browser", query: "URL of active tab of front window" },
  { app: "Safari", query: "URL of current tab of front window" },
];

export async function readActiveUrl(): Promise<string | null> {
  const fromBrowser = await readBrowserUrl();
  if (fromBrowser) return fromBrowser;

  const fromClipboard = await readClipboardUrl();
  return fromClipboard;
}

export function isUrl(
  candidate: string | undefined | null,
): candidate is string {
  return !!candidate && URL_REGEX.test(candidate.trim());
}

async function readBrowserUrl(): Promise<string | null> {
  for (const target of APPLESCRIPT_TARGETS) {
    try {
      const result = await runAppleScript(
        `tell application "${target.app}" to return ${target.query}`,
      );
      if (isUrl(result)) return result.trim();
    } catch {
      // App not running or not installed; try next.
    }
  }
  return null;
}

async function readClipboardUrl(): Promise<string | null> {
  try {
    const text = await Clipboard.readText();
    return isUrl(text) ? text!.trim() : null;
  } catch {
    return null;
  }
}
