// PURE: what the logic of every level may ask of the OS. No Raycast/Node imports: the tab and agent levels get a
// Platform passed in, implemented for real in os.ts (AppleScript, Swift helper, files) and faked in tests
// (test/fake-platform.ts). Adding a capability: add it here, implement it in os.ts, fake it in the test helper.

export interface App {
  bundleId: string;
  name: string;
  path: string;
  /** Process id, when known: ties processes (a terminal's shells, an agent) to the app that runs them. */
  pid?: number;
}

export interface Platform {
  /** Runs AppleScript and returns its result as text. Rejects on script errors and timeouts. */
  runAppleScript(script: string): Promise<string>;
  /** Whether Raycast may use the Accessibility API (needed by windows and sidebar sources). */
  accessibilityTrusted(): Promise<boolean>;
  /** Standard windows of each app, front to back, with their native tab bars. Apps not running are omitted. */
  windows(bundleIds: string[]): Promise<AppWindows[]>;
  /**
   * Raise the window (at `index` while it has `title`, else by title, else by index) and select a native tab in it
   * (at its position while it has that title, else by title). False if not found.
   */
  raiseWindow(bundleId: string, index: number, title: string, tab?: { title: string; index: number }): Promise<boolean>;
  /** Rows of an in-window list, see SidebarQuery. */
  sidebarRows(bundleId: string, query: SidebarQuery): Promise<SidebarRow[]>;
  /** Open the row called `name` (matched as in SidebarQuery.namePattern). False if not found. */
  openSidebarRow(bundleId: string, query: SidebarQuery, name: string): Promise<boolean>;
  /** Description or title of the first element whose description or title ends with `suffix`, minus the suffix. */
  labelWithSuffix(bundleId: string, suffix: string): Promise<string | undefined>;
  /** Press the `occurrence`-th (0-based) element matching `query` labeled `label`. False if not found. */
  pressWebElement(bundleId: string, query: WebElementQuery, label: string, occurrence: number): Promise<boolean>;
  /** Title and URL of each web page open in the app, through Accessibility (Notion: one per tab). */
  webPages(bundleId: string): Promise<WebPage[]>;
  /** JSON value saved under `key` (namespaced by the caller), or `fallback`. */
  loadJson<T>(key: string, fallback: T): Promise<T>;
  saveJson(key: string, value: unknown): Promise<void>;
  /** The user's home folder, for sources that read an app's own data files. */
  homeDir(): string;
  /**
   * Text and last-modified time (ms) of the files under `dir` (up to `depth` levels down) whose name matches `name`.
   * [] if `dir` is missing.
   */
  readFiles(dir: string, name: RegExp, depth: number): Promise<{ path: string; text: string; modified?: number }[]>;
  /** Names of the entries in `dir`, [] if it's missing. */
  listDir(dir: string): Promise<string[]>;
  /** Open a URL or file path with `appPath` (an .app path), or with its registered app if omitted. */
  openUrl(url: string, appPath?: string): Promise<void>;
  /** Rows of a read-only query on an SQLite file, e.g. an app's local cache. Rejects if the file is missing. */
  querySqlite(path: string, sql: string): Promise<Record<string, unknown>[]>;
  /** Every process (all users': parent chains go through root's `login`). */
  processes(): Promise<Process[]>;
  /**
   * Sends one JSON request over a Unix socket speaking newline-delimited JSON and returns the parsed response
   * line. Rejects if nothing listens there or it doesn't answer in time.
   */
  socketRequest(path: string, request: unknown): Promise<unknown>;
  /** The last `bytes` bytes of a file as text (from a line start, when it's cut). Rejects if it's missing. */
  readTail(path: string, bytes: number): Promise<string>;
  /** The git repository containing each folder (undefined if none), for grouping places into projects. */
  gitRepos(dirs: string[]): Promise<(GitRepo | undefined)[]>;
}

export interface Process {
  pid: number;
  ppid: number;
  /** Controlling terminal, e.g. "ttys003"; "" if none. */
  tty: string;
  /** Executable name, or the script's file name for interpreters (node, bun, python). */
  name: string;
  /** Milliseconds since 1970. */
  startedAt: number;
  /** Working directory; only read for processes with a terminal, "" otherwise. */
  cwd: string;
  /** Paths of the Unix sockets it's connected to; only read for herdr clients (which session they're attached to). */
  sockets?: string[];
}

export interface GitRepo {
  /** Top folder of the checkout containing the folder (a worktree's own folder for worktrees). */
  root: string;
  /** Top folder of the main checkout: the same as `root` except in linked worktrees. */
  mainRoot: string;
  /** Checked-out branch, if on one. */
  branch?: string;
  /** `origin` remote URL, if any. */
  remote?: string;
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
  /** AXDocument URL: the open file (file://...), a folder (Terminal), or a page; absent if none. */
  document?: string;
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

/** Locates elements of a web UI (Electron) through Accessibility, by DOM class and label. */
export interface WebElementQuery {
  /** Only windows whose title contains this, front to back; all windows if omitted. */
  window?: string;
  /** DOM class of an element the matches must be inside, e.g. Obsidian's "mod-root" editor area. */
  within?: string;
  /** DOM class of an element the matches must not be inside, e.g. Obsidian's popout windows' "workspace-window". */
  outside?: string;
  /** DOM class of the elements, e.g. "workspace-tab-header". Their description or title is their label. */
  className: string;
}

export interface WebPage {
  /** Document title, e.g. "Trip ideas - Claude". */
  title: string;
  url: string;
}

export interface SidebarRow {
  /** Accessible title, e.g. "Idle main" in Claude. */
  title: string;
  /** First text inside the row, e.g. "main"; empty if none. */
  text: string;
  selected: boolean;
}
