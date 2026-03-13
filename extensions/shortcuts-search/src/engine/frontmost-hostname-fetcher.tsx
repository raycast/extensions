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
    return getFrontmostLink();
  }
`;

function extractHostname(url: string): string {
  const match = url.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:/\n?]+)/im);
  return match ? match[1] : url;
}

export async function getFrontmostHostname(): Promise<string | null> {
  const url = await runAppleScript(appleScript, { language: "JavaScript" });
  return url && url !== "null" ? extractHostname(url) : null;
}
