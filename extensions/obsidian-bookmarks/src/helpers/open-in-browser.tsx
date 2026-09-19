import { open } from "@raycast/api";
import { runJxa } from "run-jxa";
import { ARC_BROWSERS, CHROMIUM_BROWSERS, SAFARI_BROWSERS } from "./browsers";

const ALL_BROWSERS = [CHROMIUM_BROWSERS, SAFARI_BROWSERS, ARC_BROWSERS];

/** The bundle id of the browser sitting behind Raycast, or null if it isn't one. */
async function getFrontmostBrowser(): Promise<string | null> {
  const result = await runJxa(
    `
    const browsers = args[0].concat(args[1], args[2]);
    const processes = Application("System Events").applicationProcesses.where({frontmost: true});
    const app = processes.length > 0 ? processes[0].bundleIdentifier() : null;
    return browsers.indexOf(app) === -1 ? null : app;
  `,
    ALL_BROWSERS
  );

  return typeof result === "string" ? result : null;
}

/** Adds a tab to the window the user is already looking at. */
async function openInCurrentWindow(bundleId: string, url: string): Promise<void> {
  await runJxa(
    `
    const [bundleId, url, chromium, safari] = args;
    const app = Application(bundleId);
    if (app.windows.length === 0) throw new Error("No window to add a tab to");

    const window = app.windows[0];
    const tab = app.Tab({url: url});
    window.tabs.push(tab);

    // Arc focuses a freshly made tab on its own; the others need telling.
    if (chromium.indexOf(bundleId) !== -1) {
      window.activeTabIndex = window.tabs.length;
    } else if (safari.indexOf(bundleId) !== -1) {
      window.currentTab = tab;
    }

    app.activate();
  `,
    [bundleId, url, CHROMIUM_BROWSERS, SAFARI_BROWSERS]
  );
}

/**
 * Opens a link as a tab of the browser window Raycast was invoked from, rather
 * than letting the system decide — which, in Arc, means a Little Arc window.
 * Falls back to the system default browser when the frontmost app isn't one.
 */
export default async function openUrlInCurrentWindow(url: string): Promise<void> {
  const bundleId = await getFrontmostBrowser().catch(() => null);
  if (!bundleId) return open(url);

  try {
    return await openInCurrentWindow(bundleId, url);
  } catch {
    // A browser that doesn't script the way we expect still gets the link.
    return open(url, bundleId);
  }
}
