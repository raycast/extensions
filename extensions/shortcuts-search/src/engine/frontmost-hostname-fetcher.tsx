import { getPlatform } from "../load/platform";
import { getWindowsFrontmostBrowserTarget } from "./windows-hostname-fetcher";
import type { ExecutionTarget } from "./execution-target";
import { runAppleScript } from "@raycast/utils";

//language=JavaScript
const appleScript = `
  const chromium = new Set([
    "com.google.Chrome",
    "com.google.Chrome.beta",
    "com.google.Chrome.canary",
    "com.vivaldi.Vivaldi",
    "com.brave.Browser",
    "com.microsoft.edgemac",
    "com.operasoftware.Opera",
    "org.chromium.Chromium",
  ]);
  const safari = new Set(["com.apple.Safari", "com.apple.SafariTechPreview"]);
  const arc = new Set(["company.thebrowser.Browser"]);

  function getFrontmostChromiumLink(bundleId) {
    const tab = Application(bundleId).windows[0].activeTab();
    return tab.url();
  }

  function getFrontmostSafariLink(bundleId) {
    const tab = Application(bundleId).documents[0];
    return tab.url();
  }

  function getFrontmostArcLink(bundleId) {
    const tab = Application(bundleId).windows[0].activeTab;
    return tab.url();
  }


  function getFrontmostApp() {
    const apps = Application("System Events")
      .applicationProcesses
      .where({ frontmost: true });
    return apps[0].bundleIdentifier();
  }

  function getFrontmostLink() {
    const app = getFrontmostApp();
    if (chromium.has(app)) {
      return getFrontmostChromiumLink(app);
    } else if (safari.has(app)) {
      return getFrontmostSafariLink(app);
    } else if (arc.has(app)) {
      return getFrontmostArcLink(app);
    } else {
      return null;
    }
  }

  function run(argv) {
    const url = getFrontmostLink();
    return url ? JSON.stringify({ bundleId: getFrontmostApp(), url }) : "null";
  }
`;

export async function getFrontmostBrowserTarget(): Promise<ExecutionTarget | null> {
  if (getPlatform() === "windows") return getWindowsFrontmostBrowserTarget();
  const result = await runAppleScript(appleScript, { language: "JavaScript" });
  if (!result || result === "null") return null;
  const { bundleId, url } = JSON.parse(result) as { bundleId: string; url: string };
  return { kind: "browser", bundleId, url, hostname: new URL(url).hostname };
}
export async function getFrontmostHostname(): Promise<string | null> {
  const target = await getFrontmostBrowserTarget();
  return target?.kind === "browser" ? target.hostname : null;
}
