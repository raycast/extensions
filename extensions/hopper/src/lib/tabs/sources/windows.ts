// Fallback for apps without a dedicated source: their windows through Accessibility, one entry per window,
// or per tab when the window has a native macOS tab bar (Ghostty, Finder, TextEdit...).

import { fileReopenTarget } from "../reopen";
import { TabGoneError, type App, type AppWindows, type Platform, type Tab, type TabSource } from "../model";

interface Ref {
  index: number;
  title: string;
  /** Native tab to select in the window. */
  tab?: string;
  /** The window's document URL (see AXWindow.document), kept for Recently Closed. */
  document?: string;
}

/** Private-browsing windows of browsers without a dedicated source (Firefox, Safari's own suffix...): skipped. */
const PRIVATE_WINDOW = /(?:Private Browsing|Incognito|InPrivate)\)?$/;

export function fromWindows(app: App, appWindows: AppWindows["windows"]): Tab<Ref>[] {
  return appWindows.flatMap((w, i): Tab<Ref>[] => {
    if (PRIVATE_WINDOW.test(w.title)) return [];
    const front = i === 0;
    const detail = w.minimized ? "Minimized" : undefined;
    if (w.tabs.length > 1) {
      return w.tabs.map((t, j) => ({
        key: `${app.bundleId}:w${w.index}:${j}:${t.title}`,
        app,
        source: windows.id,
        kind: "tab",
        title: t.title || app.name,
        detail,
        active: front && t.selected,
        // The window's document is its selected tab's.
        ref: {
          index: w.index,
          title: w.title,
          tab: t.title,
          ...(t.selected && w.document ? { document: w.document } : {}),
        },
      }));
    }
    return [
      {
        key: `${app.bundleId}:w${w.index}:${w.title}`,
        app,
        source: windows.id,
        kind: "window",
        title: w.title || app.name,
        detail,
        active: front,
        ref: { index: w.index, title: w.title, ...(w.document ? { document: w.document } : {}) },
      },
    ];
  });
}

async function listAll(apps: App[], platform: Platform): Promise<Tab<Ref>[]> {
  if (apps.length === 0) return [];
  const byId = new Map(apps.map((a) => [a.bundleId, a]));
  const all = await platform.windows(apps.map((a) => a.bundleId));
  return all.flatMap((entry) => {
    const app = byId.get(entry.bundleId);
    return app ? fromWindows(app, entry.windows) : [];
  });
}

export const windows: TabSource<Ref> = {
  id: "windows",
  bundleIds: [],
  list: (app, platform) => listAll([app], platform),
  listAll,
  select: async (tab, platform) => {
    const { index, title, tab: nativeTab } = tab.ref;
    if (!(await platform.raiseWindow(tab.app.bundleId, index, title, nativeTab))) {
      throw new TabGoneError("Window no longer exists");
    }
  },
  reopenTarget: (tab) => fileReopenTarget(tab.ref.document),
};
