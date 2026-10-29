import { BrowserExtension, environment, getFrontmostApplication } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export type Tab = { url: string; title?: string };

/// What each browser calls the tab in front, in AppleScript.
const scripts: Record<string, string> = {
  "com.apple.Safari": `tell application id "com.apple.Safari" to return {URL, name} of current tab of front window`,
  "com.apple.SafariTechnologyPreview": `tell application id "com.apple.SafariTechnologyPreview" to return {URL, name} of current tab of front window`,
  "com.google.Chrome": `tell application id "com.google.Chrome" to return {URL, title} of active tab of front window`,
  "com.google.Chrome.beta": `tell application id "com.google.Chrome.beta" to return {URL, title} of active tab of front window`,
  "com.brave.Browser": `tell application id "com.brave.Browser" to return {URL, title} of active tab of front window`,
  "com.microsoft.edgemac": `tell application id "com.microsoft.edgemac" to return {URL, title} of active tab of front window`,
  "company.thebrowser.Browser": `tell application id "company.thebrowser.Browser" to return {URL, title} of active tab of front window`,
  "com.vivaldi.Vivaldi": `tell application id "com.vivaldi.Vivaldi" to return {URL, title} of active tab of front window`,
  "dev.ipang.anity": `tell application id "dev.ipang.anity" to return {URL, name} of current tab of front window`,
};

/// The page in front of the browser in front: asked of the browser itself, or
/// of Raycast's browser extension when the browser is one AppleScript can't
/// reach.
export async function frontTab(): Promise<Tab> {
  const front = await getFrontmostApplication().catch(() => undefined);
  const script = front?.bundleId ? scripts[front.bundleId] : undefined;
  if (script) {
    let raw: string;
    try {
      raw = await runAppleScript(script, { humanReadableOutput: false });
    } catch {
      throw new Error(`Could not read the tab in ${front?.name}. Check Raycast's browser Automation permission.`);
    }
    const tab = parseAppleScriptPair(raw);
    if (tab) return tab;
    throw new Error(`No readable http or https page in ${front?.name}.`);
  }
  if (environment.canAccess(BrowserExtension)) {
    const tabs = await BrowserExtension.getTabs().catch(() => []);
    const active = tabs.find((tab) => tab.active);
    if (active?.url) return { url: active.url, title: active.title };
  }
  throw new Error(front?.name ? `No page open in ${front.name}` : "No browser tab in front");
}

/// AppleScript's {"https://…", "Title"} as it comes back unformatted.
export function parseAppleScriptPair(raw: string): Tab | undefined {
  const match = raw.trim().match(/^\{\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*\}$/);
  if (!match) return undefined;
  const unescape = (s: string) => s.replace(/\\(.)/g, "$1");
  const url = unescape(match[1]);
  if (!/^https?:\/\//.test(url)) return undefined;
  return { url, title: unescape(match[2]) || undefined };
}
