import { getFrontmostApplication, getPreferenceValues, showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { attempt } from "./components";
import { lit, openURL } from "./yab";

type Browser = { id: string; name: string; tab: string };

// Safari says "current tab", the Chromium ones (Arc and Dia too) "active tab".
const BROWSERS: Browser[] = [
  { id: "com.apple.Safari", name: "Safari", tab: "current tab" },
  { id: "com.google.Chrome", name: "Chrome", tab: "active tab" },
  { id: "company.thebrowser.Browser", name: "Arc", tab: "active tab" },
  { id: "company.thebrowser.dia", name: "Dia", tab: "active tab" },
  { id: "com.brave.Browser", name: "Brave", tab: "active tab" },
  { id: "com.microsoft.edgemac", name: "Edge", tab: "active tab" },
  { id: "com.vivaldi.Vivaldi", name: "Vivaldi", tab: "active tab" },
  { id: "org.chromium.Chromium", name: "Chromium", tab: "active tab" },
];

async function running(id: string): Promise<boolean> {
  return (await runAppleScript(`return application id ${lit(id)} is running`)) === "true";
}

export default async function Command() {
  const { closeInSource } = getPreferenceValues<Preferences.MovePageToYab>();
  await attempt("Couldn't move the page", async () => {
    const front = await getFrontmostApplication().catch(() => undefined);
    let browser = BROWSERS.find((b) => b.id === front?.bundleId);
    if (!browser) {
      for (const b of BROWSERS)
        if (await running(b.id)) {
          browser = b;
          break;
        }
    }
    if (!browser) {
      await showHUD("No other browser is open");
      return;
    }
    const url = await runAppleScript(
      `tell application id ${lit(browser.id)} to get URL of ${browser.tab} of front window`,
    );
    if (!/^https?:/.test(url)) {
      await showHUD(`${browser.name}'s tab has no page to move`);
      return;
    }
    await openURL(url, "tab");
    if (closeInSource)
      await runAppleScript(`tell application id ${lit(browser.id)} to close ${browser.tab} of front window`);
    await showHUD(`Moved from ${browser.name}`);
  });
}
