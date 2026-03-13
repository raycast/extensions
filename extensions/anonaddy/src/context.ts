import { BrowserExtension, environment, getDefaultApplication, getFrontmostApplication } from "@raycast/api";

const KNOWN_BROWSERS = [
  "com.apple.Safari",
  "com.google.Chrome",
  "com.microsoft.edgemac",
  "com.operasoftware.Opera",
  "company.thebrowser.Browser",
  "org.mozilla.firefox",
];

async function get() {
  const [frontmostApp, defaultBrowser] = await Promise.all([
    getFrontmostApplication(),
    getDefaultApplication("https://www.google.com"),
  ]);

  let context = frontmostApp.name;
  const isBrowser =
    frontmostApp.bundleId === defaultBrowser.bundleId || KNOWN_BROWSERS.includes(frontmostApp.bundleId ?? "");

  if (environment.canAccess(BrowserExtension) && isBrowser) {
    const [tab] = (await BrowserExtension.getTabs()).filter((tab) => tab.active);

    context = tab?.title ?? tab?.url ?? context;
  }

  return context;
}

export { get };
