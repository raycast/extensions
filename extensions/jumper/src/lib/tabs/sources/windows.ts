// Fallback for apps without a dedicated source: their windows through Accessibility, one entry per window,
// or per tab when the window has a native macOS tab bar (Ghostty, Finder, TextEdit...).

import { TabGoneError, type App, type AppWindows, type Platform, type Tab, type TabSource } from "../model";

interface Ref {
  index: number;
  title: string;
  /** Native tab to select in the window. */
  tab?: string;
}

export function fromWindows(app: App, appWindows: AppWindows["windows"]): Tab<Ref>[] {
  return appWindows.flatMap((w, i): Tab<Ref>[] => {
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
        ref: { index: w.index, title: w.title, tab: t.title },
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
        ref: { index: w.index, title: w.title },
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
};
