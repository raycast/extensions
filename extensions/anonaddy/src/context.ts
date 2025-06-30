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
  const [app, browser] = await Promise.all([
    getFrontmostApplication(),
    getDefaultApplication("https://www.google.com"),
  ]);

  let context = app.name;

  if (
    environment.canAccess(BrowserExtension) &&
    (app.bundleId === browser.bundleId || KNOWN_BROWSERS.includes(app.bundleId ?? ""))
  ) {
    const [tab] = (await BrowserExtension.getTabs()).filter((tab) => tab.active);

    context = tab?.title ?? tab?.url ?? app.name;
  }

  return context;
}

export { get };
