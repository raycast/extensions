import { getFrontmostApplication, getPreferenceValues, LocalStorage } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { browserConfigKey, BROWSERS, BrowserConfig, chooseBrowser, parseBrowserConfig } from "./browser-config";
import { CURRENT_BROWSER_TAB_SCRIPT } from "./browser-script";
import { decodeSafariTab, extractJiraIssue, JiraIssue } from "./jira";

const configKey = () => browserConfigKey(getPreferenceValues<Preferences>().url_prefix);

export async function loadBrowserConfig() {
  return parseBrowserConfig(await LocalStorage.getItem(configKey()));
}
export async function saveBrowserConfig(config: BrowserConfig) {
  await LocalStorage.setItem(configKey(), JSON.stringify(config));
}

export async function detectCurrentJira(): Promise<{ issue?: JiraIssue; notice: string }> {
  const config = await loadBrowserConfig();
  if (!config.autoDetectJira) return { notice: "" };
  let browser: (typeof BROWSERS)[number] | undefined;
  try {
    const frontmost = config.browser === "frontmost" ? await getFrontmostApplication() : undefined;
    browser = chooseBrowser(config, frontmost?.bundleId);
    if (!browser)
      return {
        notice: "",
      };
    const output = await runAppleScript(CURRENT_BROWSER_TAB_SCRIPT, [browser.id], {
      language: "JavaScript",
      timeout: 15000,
      // The script returns a JSON string, rather than an AppleScript list/record.
      humanReadableOutput: true,
    });
    const tab = decodeSafariTab(output);
    try {
      return { issue: extractJiraIssue(tab, config.jiraDomains), notice: "" };
    } catch {
      return {
        notice: "",
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const name = browser?.name ?? "the browser";
    if (/not authorized|not permitted|-1743/i.test(message))
      return {
        notice: `To attach Jira tickets, allow Raycast → ${name} in macOS Privacy & Security → Automation.`,
      };
    if (/BROWSER_NOT_RUNNING|BROWSER_NO_WINDOWS/.test(message))
      return { notice: `${name} has no open window. Open a ticket or choose another browser in MOCO Settings.` };
    return {
      notice: `Could not read ${name}'s current tab. Check Automation access or choose another browser in MOCO Settings.`,
    };
  }
}
