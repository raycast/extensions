import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface BrowserTab {
  bundleId: string;
  appName: string;
  windowIndex: number;
  tabIndex: number;
  title: string;
  url: string;
  windowName?: string;
}

/** Bundle IDs → JXA application names for supported browsers */
const SUPPORTED_BROWSERS: Record<string, string> = {
  "com.brave.Browser": "Brave Browser",
  "com.google.Chrome": "Google Chrome",
  "com.google.Chrome.canary": "Google Chrome Canary",
  "com.apple.Safari": "Safari",
  "com.microsoft.edgemac": "Microsoft Edge",
  "company.thebrowser.Browser": "Arc",
};

export function isSupportedBrowser(bundleId: string): boolean {
  return bundleId in SUPPORTED_BROWSERS;
}

/** Get all tabs from a running browser via JXA. Returns [] on failure. */
export async function getBrowserTabs(bundleId: string): Promise<BrowserTab[]> {
  const appName = SUPPORTED_BROWSERS[bundleId];
  if (!appName) return [];

  const script =
    bundleId === "com.apple.Safari"
      ? safariTabsScript(appName)
      : chromiumTabsScript(appName);

  try {
    const { stdout } = await execFileAsync(
      "osascript",
      ["-l", "JavaScript", "-e", script],
      { encoding: "utf8", timeout: 5000 },
    );
    const output = stdout?.trim();
    if (!output) return [];

    const tabs = JSON.parse(output) as Array<{
      windowIndex: number;
      tabIndex: number;
      title: string;
      url: string;
      windowName?: string;
    }>;

    return tabs.map((t) => ({ ...t, bundleId, appName }));
  } catch {
    return [];
  }
}

/** Bring a browser window to front without changing the active tab. */
export async function focusBrowserWindow(
  bundleId: string,
  windowIndex: number,
): Promise<boolean> {
  const appName = SUPPORTED_BROWSERS[bundleId];
  if (!appName) return false;

  const script = `
    const app = Application(${JSON.stringify(appName)});
    app.windows[${windowIndex}].index = 1;
    app.activate();
  `;

  try {
    await execFileAsync("osascript", ["-l", "JavaScript", "-e", script], {
      encoding: "utf8",
      timeout: 5000,
    });
    return true;
  } catch {
    return false;
  }
}

/** Switch to a specific tab in a browser window. */
export async function switchToTab(
  bundleId: string,
  windowIndex: number,
  tabIndex: number,
): Promise<boolean> {
  const appName = SUPPORTED_BROWSERS[bundleId];
  if (!appName) return false;

  const script =
    bundleId === "com.apple.Safari"
      ? safariSwitchScript(appName, windowIndex, tabIndex)
      : chromiumSwitchScript(appName, windowIndex, tabIndex);

  try {
    await execFileAsync("osascript", ["-l", "JavaScript", "-e", script], {
      encoding: "utf8",
      timeout: 5000,
    });
    return true;
  } catch {
    return false;
  }
}

/** Close a specific tab in a browser window. */
export async function closeTab(
  bundleId: string,
  windowIndex: number,
  tabIndex: number,
  windowName?: string,
  tabUrl?: string,
): Promise<boolean> {
  const appName = SUPPORTED_BROWSERS[bundleId];
  if (!appName) return false;

  const script = `
    const app = Application(${JSON.stringify(appName)});
    const win = app.windows[${windowIndex}];
    ${windowName != null ? `if (win.title() !== ${JSON.stringify(windowName)}) throw new Error("window mismatch");` : ""}
    const tab = win.tabs[${tabIndex}];
    ${tabUrl != null ? `if (tab.url() !== ${JSON.stringify(tabUrl)}) throw new Error("tab mismatch");` : ""}
    tab.close();
  `;

  try {
    await execFileAsync("osascript", ["-l", "JavaScript", "-e", script], {
      encoding: "utf8",
      timeout: 5000,
    });
    return true;
  } catch {
    return false;
  }
}

/** Close an entire browser window. */
export async function closeBrowserWindow(
  bundleId: string,
  windowIndex: number,
  windowName?: string,
): Promise<boolean> {
  const appName = SUPPORTED_BROWSERS[bundleId];
  if (!appName) return false;

  const script = `
    const app = Application(${JSON.stringify(appName)});
    const win = app.windows[${windowIndex}];
    ${windowName != null ? `if (win.title() !== ${JSON.stringify(windowName)}) throw new Error("window mismatch");` : ""}
    win.close();
  `;

  try {
    await execFileAsync("osascript", ["-l", "JavaScript", "-e", script], {
      encoding: "utf8",
      timeout: 5000,
    });
    return true;
  } catch {
    return false;
  }
}

/** Extract domain from URL for display. */
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// --- JXA scripts ---

function chromiumTabsScript(appName: string): string {
  return `
    const app = Application(${JSON.stringify(appName)});
    const tabs = [];
    const windows = app.windows();
    for (let wi = 0; wi < windows.length; wi++) {
      try {
        const windowName = windows[wi].title() || "";
        const windowTabs = windows[wi].tabs();
        for (let ti = 0; ti < windowTabs.length; ti++) {
          try {
            tabs.push({
              windowIndex: wi,
              tabIndex: ti,
              title: windowTabs[ti].title(),
              url: windowTabs[ti].url(),
              windowName: windowName
            });
          } catch(e) {}
        }
      } catch(e) {}
    }
    JSON.stringify(tabs);
  `;
}

function safariTabsScript(appName: string): string {
  return `
    const app = Application(${JSON.stringify(appName)});
    const tabs = [];
    const windows = app.windows();
    for (let wi = 0; wi < windows.length; wi++) {
      try {
        const windowTabs = windows[wi].tabs();
        for (let ti = 0; ti < windowTabs.length; ti++) {
          try {
            tabs.push({
              windowIndex: wi,
              tabIndex: ti,
              title: windowTabs[ti].name(),
              url: windowTabs[ti].url()
            });
          } catch(e) {}
        }
      } catch(e) {}
    }
    JSON.stringify(tabs);
  `;
}

function chromiumSwitchScript(
  appName: string,
  windowIndex: number,
  tabIndex: number,
): string {
  // Chromium activeTabIndex is 1-based
  return `
    const app = Application(${JSON.stringify(appName)});
    app.windows[${windowIndex}].activeTabIndex = ${tabIndex + 1};
    app.windows[${windowIndex}].index = 1;
    app.activate();
  `;
}

function safariSwitchScript(
  appName: string,
  windowIndex: number,
  tabIndex: number,
): string {
  return `
    const app = Application(${JSON.stringify(appName)});
    app.windows[${windowIndex}].currentTab = app.windows[${windowIndex}].tabs[${tabIndex}];
    app.windows[${windowIndex}].index = 1;
    app.activate();
  `;
}
