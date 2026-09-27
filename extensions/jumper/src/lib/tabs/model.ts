// PURE: types for the tab level. No Raycast/Node imports, so everything built on them is unit-testable.
//
// A *source* knows how to read and select tabs in one family of apps (Chromium browsers, cmux, Claude...).
// Sources never call macOS directly: they get a `Platform`, implemented for real in src/lib/platform/tabs.ts
// and faked in tests. To support a new app, add a source under sources/ and list it in registry.ts.
// New per-tab actions (e.g. closing a tab) belong on TabSource as optional methods, so the UI can offer an
// action only for sources that implement it.

export interface App {
  bundleId: string;
  name: string;
  path: string;
}

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
  url?: string;
  /** Selected tab of its window, or the open session. */
  active: boolean;
  /** Whatever the source needs to find this tab again. Must be JSON-serializable (the list is cached). */
  ref: Ref;
}

export interface TabSource<Ref = unknown> {
  id: string;
  /** Apps this source handles. The windows source is the fallback for all others (see registry.ts). */
  bundleIds: readonly string[];
  /** Tabs of one app, in the app's own order. */
  list(app: App, platform: Platform): Promise<Tab<Ref>[]>;
  /** Optional batch form of `list`, used when present: reads many apps with one native call. */
  listAll?(apps: App[], platform: Platform): Promise<Tab<Ref>[]>;
  /** Select the tab inside its app. The caller brings the app to the front afterwards. Throws TabGoneError. */
  select(tab: Tab<Ref>, platform: Platform): Promise<void>;
}

/** The tab disappeared (closed, moved) between listing and selecting. */
export class TabGoneError extends Error {
  constructor(message = "Tab no longer exists") {
    super(message);
    this.name = "TabGoneError";
  }
}

/** What sources may ask of the OS. macOS implementation: src/lib/platform/tabs.ts. */
export interface Platform {
  /** Runs AppleScript and returns its result as text. Rejects on script errors and timeouts. */
  runAppleScript(script: string): Promise<string>;
  /** Whether Raycast may use the Accessibility API (needed by windows and sidebar sources). */
  accessibilityTrusted(): Promise<boolean>;
  /** Standard windows of each app, front to back, with their native tab bars. Apps not running are omitted. */
  windows(bundleIds: string[]): Promise<AppWindows[]>;
  /** Raise the window (by title, else index) and select a native tab in it. False if not found. */
  raiseWindow(bundleId: string, index: number, title: string, tab?: string): Promise<boolean>;
  /** Rows of an in-window list, see SidebarQuery. */
  sidebarRows(bundleId: string, query: SidebarQuery): Promise<SidebarRow[]>;
  /** Open the row called `name` (matched as in SidebarQuery.namePattern). False if not found. */
  openSidebarRow(bundleId: string, query: SidebarQuery, name: string): Promise<boolean>;
  /** Description of the first element whose description ends with `suffix`, minus the suffix. */
  labelWithSuffix(bundleId: string, suffix: string): Promise<string | undefined>;
}

export interface AppWindows {
  bundleId: string;
  windows: AXWindow[];
}

export interface AXWindow {
  /** 1-based position in the app's window list, front to back. */
  index: number;
  title: string;
  minimized: boolean;
  tabs: { title: string; selected: boolean }[];
}

/** Locates a list inside an app's window through Accessibility. */
export interface SidebarQuery {
  /** Accessible title or description of the list's container, e.g. Claude's "Sidebar". */
  container: string;
  /** Role of the rows, e.g. "AXButton". */
  rowRole: string;
  /**
   * Regex whose group 1 is a row's name, for apps that add state to row titles (Muse appends
   * "<date> More thread actions" on hover). Rows are matched by name when opening them.
   */
  namePattern?: string;
  /** Open rows by focusing them and sending Return, for apps that ignore AXPress (Muse). */
  keyboard?: boolean;
}

export interface SidebarRow {
  /** Accessible title, e.g. "Idle main" in Claude. */
  title: string;
  /** First text inside the row, e.g. "main"; empty if none. */
  text: string;
  selected: boolean;
}
