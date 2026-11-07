import { getFrontmostApplication } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

// Fixed allowlist: bundle ID → AppleScript name and URL expression.
const BROWSERS: Record<string, { name: string; script: string }> = {
  "com.apple.Safari": { name: "Safari", script: "URL of current tab of front window" },
  "com.apple.SafariTechnologyPreview": {
    name: "Safari Technology Preview",
    script: "URL of current tab of front window",
  },
  "com.kagi.kagimacOS": { name: "Orion", script: "URL of current tab of front window" },
  "com.google.Chrome": { name: "Google Chrome", script: "URL of active tab of front window" },
  "com.google.Chrome.beta": { name: "Google Chrome Beta", script: "URL of active tab of front window" },
  "com.brave.Browser": { name: "Brave Browser", script: "URL of active tab of front window" },
  "com.microsoft.edgemac": { name: "Microsoft Edge", script: "URL of active tab of front window" },
  "com.vivaldi.Vivaldi": { name: "Vivaldi", script: "URL of active tab of front window" },
  "company.thebrowser.Browser": { name: "Arc", script: "URL of active tab of front window" },
  "company.thebrowser.dia": { name: "Dia", script: "URL of active tab of front window" },
};

export const SUPPORTED_BROWSER_NAMES = Object.values(BROWSERS).map((browser) => browser.name);

/** URL of the active tab in the browser that was frontmost before Raycast opened. */
export async function currentTabUrl(): Promise<{ url: string; browser: string }> {
  const app = await getFrontmostApplication();
  const browser = app.bundleId ? BROWSERS[app.bundleId] : undefined;
  if (!browser) {
    throw new Error(`${app.name} isn't a supported browser. Use ${SUPPORTED_BROWSER_NAMES.slice(0, 6).join(", ")}…`);
  }
  let url: string;
  try {
    url = (
      await runAppleScript(`tell application "${browser.name}" to return ${browser.script}`, { timeout: 5000 })
    ).trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/not authori[sz]ed|-1743/i.test(message)) {
      throw new Error(`Allow Raycast to control ${browser.name} in System Settings → Privacy & Security → Automation.`);
    }
    throw new Error(`Couldn't read the current tab from ${browser.name}.`);
  }
  if (!/^https?:\/\//i.test(url)) throw new Error("The current tab isn't a web page.");
  return { url, browser: browser.name };
}
