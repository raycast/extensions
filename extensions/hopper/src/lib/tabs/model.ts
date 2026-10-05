// PURE: types for the tab level: the places inside an app you can jump to (windows, tabs, sessions) and the
// panes inside them. No Raycast/Node imports, so everything built on them is unit-testable.
//
// A *source* knows how to read and select tabs in one family of apps (Chromium browsers, cmux, Claude...).
// Sources never call macOS directly: they get a `Platform` (../platform/model.ts). To support a new app, add a
// source under sources/ and list it in registry.ts. New per-tab actions (e.g. closing a tab) belong on TabSource
// as optional methods, so the UI can offer an action only for sources that implement it.

import type { App, Platform } from "../platform/model";

// Sources use these with their own types; they live with the Platform they describe.
export type {
  App,
  AppWindows,
  AXWindow,
  Platform,
  SidebarQuery,
  SidebarRow,
  WebElementQuery,
  WebPage,
} from "../platform/model";

/** Drives the list icon and search keywords. */
export type TabKind = "tab" | "window" | "workspace" | "session" | "conversation";

export interface Tab<Ref = unknown> {
  /** Unique across all apps; stable while the tab exists. */
  key: string;
  app: App;
  /** Id of the TabSource that produced it, used to route actions back. */
  source: string;
  kind: TabKind;
  title: string;
  /** URL, working directory, or status. */
  detail?: string;
  /** `detail` before shortening (e.g. a Notion page's full path): shown on hover and searched. */
  detailFull?: string;
  url?: string;
  /** Selected tab of its window, or the open session. */
  active: boolean;
  /** Whatever the source needs to find this tab again. Must be JSON-serializable (the list is cached). */
  ref: Ref;
  /**
   * Terminal panes in this tab (splits, or the tab's single shell), with their tty: how an agent running in a
   * terminal is tied to the exact place it runs (agents/locate.ts). Only sources that can select a pane, or whose
   * tab is one shell, set it.
   */
  panes?: Pane[];
  /**
   * For places inside another app's terminal (a herdr tab): the tty of the terminal they're shown in. loadTabs
   * finds that terminal's tab (`within`), and selecting this place selects it too.
   */
  hostTty?: string;
  /** The tab (and pane) of the host app showing this place; set by loadTabs from `hostTty`. */
  within?: { tab: Tab; paneId: string };
}

export interface Pane {
  /** The source's id for the pane (iTerm session id, cmux or Ghostty terminal id, a Terminal tab's tty). */
  id: string;
  /** e.g. "ttys003". Exact: every process in the pane has it. */
  tty?: string;
  /** Working folder, for terminals that don't report a tty (Ghostty): locates an agent only if it's unambiguous. */
  cwd?: string;
}

export interface TabSource<Ref = unknown> {
  id: string;
  /** Apps this source handles. The windows source is the fallback for all others (see registry.ts). */
  bundleIds: readonly string[];
  /** Tabs of one app, in the app's own order. */
  list(app: App, platform: Platform): Promise<Tab<Ref>[]>;
  /**
   * For places that aren't an app of their own but live inside one (herdr, running in some terminal): tabs found
   * among `apps`, each under the app it lives in. Such sources have no bundleIds and are listed in registry.ts's
   * DISCOVERED.
   */
  discover?(apps: App[], platform: Platform): Promise<Tab<Ref>[]>;
  /** Optional batch form of `list`, used when present: reads many apps with one native call. */
  listAll?(apps: App[], platform: Platform): Promise<Tab<Ref>[]>;
  /** Select the tab inside its app. The caller brings the app to the front afterwards. Throws TabGoneError. */
  select(tab: Tab<Ref>, platform: Platform): Promise<void>;
  /** Select one of `tab.panes` (and its tab). Sources whose tabs have one pane don't need it. Throws TabGoneError. */
  selectPane?(tab: Tab<Ref>, paneId: string, platform: Platform): Promise<void>;
  /**
   * How to open `tab` again once it's closed, for Recently Closed (history.ts); undefined if it can't be
   * reopened cleanly. Sources without it never show in Recently Closed.
   */
  reopenTarget?(tab: Tab<Ref>): ReopenTarget | undefined;
}

/** Something to open again: a URL (in the tab's app) or a file (with the tab's app). */
export interface ReopenTarget {
  kind: "url" | "file";
  /** The URL, or the file's absolute path. */
  target: string;
}

/** The tab disappeared (closed, moved) between listing and selecting. */
export class TabGoneError extends Error {
  constructor(message = "Tab no longer exists") {
    super(message);
    this.name = "TabGoneError";
  }
}
