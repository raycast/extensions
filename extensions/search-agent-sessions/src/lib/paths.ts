import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * The only platform test in the extension. Raycast exposes no runtime platform
 * property — `platforms` in the manifest is a store-listing declaration, not
 * something a command can read — so this is `process.platform`, and every
 * function whose behaviour turns on it takes it as a defaulted argument so the
 * other platform's branch is still reachable from the unit suite.
 */
export const IS_WINDOWS = process.platform === "win32";

/**
 * Where the derived corpus lives. Raycast hands each extension a support
 * directory and asks that files be written there, so it is removed when the
 * extension is — a 69MB index left in `~/.cache` after an uninstall is exactly
 * what that rule exists to prevent.
 *
 * It arrives by injection rather than by importing `environment` here, because
 * nothing under `src/lib` may import `@raycast/api`: the unit suite runs these
 * modules in plain Node, and one such import would take the whole library out
 * of its reach. The command calls {@link setSupportPath} at module scope, which
 * runs before any of the accessors below can be called — they are functions
 * rather than constants for exactly that reason, so none of them reads the
 * default that early.
 *
 * That default is therefore only ever seen by the test and bench harnesses,
 * which have no Raycast to ask.
 */
let supportPath = join(homedir(), ".cache", "search-agent-sessions");

export function setSupportPath(dir: string): void {
  supportPath = dir;
}

export const cacheDir = () => supportPath;
export const corpusPath = () => join(supportPath, "corpus.txt");
export const manifestPath = () => join(supportPath, "sessions.json");

// Both agents store transcripts under the home directory on either platform, so
// these need no branch: on Windows they land in C:\Users\<you>\.claude\projects.
export const CLAUDE_ROOT = join(homedir(), ".claude", "projects");
export const CODEX_ROOT = join(homedir(), ".codex", "sessions");

/**
 * The machine-wide install roots, read from the environment rather than spelled
 * out: both are relocatable, and a Windows installed to any drive but C: puts
 * them somewhere a hard-coded "C:\\" never finds. The per-user roots are read
 * the same way, since a roaming profile moves %APPDATA% off the home directory.
 */
const winDir = (name: string, fallback: string) =>
  process.env[name] || fallback;

/**
 * Where a user-installed CLI plausibly lives: package managers, version-manager
 * shims, and hand-rolled installs. Used both to probe for a binary and to widen
 * the PATH our subprocesses inherit.
 */
const BIN_DIRS = IS_WINDOWS
  ? [
      join(homedir(), "scoop", "shims"),
      join(homedir(), ".cargo", "bin"),
      // Where the agents' own native installers land, on Windows as on Unix.
      join(homedir(), ".local", "bin"),
      join(winDir("APPDATA", join(homedir(), "AppData", "Roaming")), "npm"),
      join(
        winDir("LOCALAPPDATA", join(homedir(), "AppData", "Local")),
        "Microsoft",
        "WinGet",
        "Links",
      ),
      join(winDir("ProgramData", "C:\\ProgramData"), "chocolatey", "bin"),
      join(winDir("ProgramFiles", "C:\\Program Files"), "Git", "usr", "bin"),
    ]
  : [
      "/opt/homebrew/bin",
      "/usr/local/bin",
      "/usr/bin",
      "/bin",
      "/opt/local/bin", // MacPorts
      join(homedir(), ".local", "bin"),
      join(homedir(), ".cargo", "bin"),
      join(homedir(), ".local", "share", "mise", "shims"),
      join(homedir(), ".asdf", "shims"),
      join(homedir(), ".volta", "bin"),
    ];

/**
 * Raycast spawns the extension with a login-shell-free PATH, so bare `rg`/`orca`
 * frequently fail to resolve. Probe `preferred` (install locations we expect, in
 * priority order) and then every known bin dir; falling back to the bare name is
 * still worth it because subprocesses run with {@link SPAWN_ENV}, whose PATH
 * covers installs we never guessed.
 */
function resolveBin(name: string, preferred: string[]): string {
  for (const c of preferred) if (existsSync(c)) return c;
  for (const dir of BIN_DIRS) {
    const candidate = join(dir, name);
    if (existsSync(candidate)) return candidate;
  }
  return name;
}

/**
 * Environment for every subprocess we launch. The inherited PATH stays in front
 * so a working entry always wins; our directories only extend the search.
 *
 * Windows spells the variable `Path`, so copying the environment and then
 * assigning `PATH` leaves the object holding two of them — the widened one and
 * the original. libuv sorts the child's environment block case-insensitively,
 * which makes that pair compare equal and their order arbitrary, so the child
 * resolves `claude` or `codex` against whichever won: the whole point of
 * {@link BIN_DIRS} becomes a coin flip, and the user sees a duplicated PATH in
 * every terminal we open. Every existing spelling is therefore dropped before
 * ours goes in, so exactly one reaches the child.
 */
export function spawnEnv(
  env: NodeJS.ProcessEnv = process.env,
  dirs: readonly string[] = BIN_DIRS,
  windows = IS_WINDOWS,
): NodeJS.ProcessEnv {
  const copy = { ...env };
  let inherited = env.PATH;
  if (windows)
    for (const key of Object.keys(copy))
      if (key.toLowerCase() === "path") {
        inherited ||= copy[key];
        delete copy[key];
      }
  copy.PATH = [inherited, ...dirs].filter(Boolean).join(windows ? ";" : ":");
  return copy;
}

export const SPAWN_ENV: NodeJS.ProcessEnv = spawnEnv();

export const RG_BIN = IS_WINDOWS
  ? resolveBin("rg.exe", [])
  : resolveBin("rg", [
      "/opt/homebrew/bin/rg",
      "/usr/local/bin/rg",
      "/usr/bin/rg",
    ]);

/** Orca ships for macOS only, so on Windows this stays the unresolved name. */
export const ORCA_BIN = IS_WINDOWS
  ? "orca"
  : resolveBin("orca", ["/usr/local/bin/orca", "/opt/homebrew/bin/orca"]);

export const ORCA_BUNDLE_ID = "com.stablyai.orca";

export function expandTilde(p: string): string {
  if (p === "~") return homedir();
  // Both separators, because a Windows user typing a home-relative root will
  // reach for the backslash their shell and Explorer both use.
  if (p.startsWith("~/") || p.startsWith("~\\"))
    return join(homedir(), p.slice(2));
  return p;
}

/** The inverse, for paths shown in a space the home prefix would dominate. */
export function collapseTilde(p: string, windows = IS_WINDOWS): string {
  const home = homedir();
  if (p === home) return "~";
  return isUnder(p, home, windows) ? `~${p.slice(home.length)}` : p;
}

/**
 * The deepest directory in `dirs` containing `path`, or "" if none does.
 *
 * Worktrees nest, so the deepest match is the right one: a workspace checked
 * out inside another repository is its own root, and naming the outer one would
 * reach the wrong tree.
 */
export function enclosingRoot(
  path: string,
  dirs: string[],
  windows = IS_WINDOWS,
): string {
  let best = "";
  for (const dir of dirs)
    if (isUnder(path, dir, windows) && dir.length > best.length) best = dir;
  return best;
}

/**
 * A file named in a list that already says which project it belongs to: written
 * relative to `dir` when it is inside it, home-relative otherwise.
 *
 * The project directory itself is left whole, since relativising it yields the
 * empty string, which names nothing.
 */
export function displayPath(
  p: string,
  dir: string,
  windows = IS_WINDOWS,
): string {
  return dir && p !== dir && isUnder(p, dir, windows)
    ? p.slice(dir.length + 1)
    : collapseTilde(p, windows);
}

/**
 * The separator normalized paths are spelled with. Taken from the argument
 * rather than `node:path`'s `sep` so that the whole module behaves the same
 * whichever host is running it, and the other platform's branch stays reachable
 * from the unit suite.
 */
export const separatorFor = (windows: boolean) => (windows ? "\\" : "/");

/**
 * A path spelled the way the rest of the extension segments and compares it.
 * Windows accepts both separators and its APIs hand back either — a cwd copied
 * out of a transcript may be `C:/Users/Aki/code` where the root the user typed
 * is `C:\Users\Aki\code` — so the spelling is settled once, where a path enters
 * the extension, and every comparison and split downstream can then assume it.
 * Nothing to settle on macOS, where a backslash is an ordinary filename byte.
 */
export function normalizeSeparators(p: string, windows = IS_WINDOWS): string {
  return windows ? p.replace(/\//g, "\\") : p;
}

export function stripTrailingSep(p: string, windows = IS_WINDOWS): string {
  let end = p.length;
  // Explicit separators, not the host's: a Windows path handed to a macOS test
  // run has to lose the same tail a Windows host would strip off it.
  while (end > 0 && (p[end - 1] === "/" || (windows && p[end - 1] === "\\")))
    end--;
  return p.slice(0, end);
}

/**
 * Whether `path` is `dir` or sits inside it. Compares whole path segments, so
 * "/rootless" is not inside "/root". Every directory comparison in this
 * extension depends on that, which is why they all route through here.
 *
 * Both sides are assumed to be spelled with the platform's separator; see
 * {@link normalizeSeparators} for where that is arranged. Case is the one
 * difference left to absorb, Windows filesystems being case-insensitive.
 */
export function underDir(
  dir: string,
  windows = IS_WINDOWS,
): (path: string) => boolean {
  if (!windows) {
    const prefix = dir + "/";
    return (path) => path === dir || path.startsWith(prefix);
  }
  // Folded once rather than once per call. This predicate is built per filter
  // and then run per corpus line — hundreds of thousands of them per keystroke
  // — and the directory is the same string every time, so lowercasing it and
  // concatenating its separator inside the loop was two allocations a line for
  // an answer that never changes.
  const d = dir.toLowerCase();
  const prefix = d + "\\";
  return (path) => {
    const p = path.toLowerCase();
    return p === d || p.startsWith(prefix);
  };
}

/** The one-shot form, for the callers that compare against a different directory each time. */
export function isUnder(
  path: string,
  dir: string,
  windows = IS_WINDOWS,
): boolean {
  if (windows) {
    const p = path.toLowerCase();
    const d = dir.toLowerCase();
    return p === d || p.startsWith(d + "\\");
  }
  return path === dir || path.startsWith(dir + "/");
}

/**
 * The search-root preference as a path that can be compared and extended: tilde
 * expanded, surrounding whitespace gone, spelled with the platform's separator,
 * and every trailing separator stripped so a root typed with one still matches a
 * cwd equal to it. Stripping also turns a bare "/" into "", which correctly
 * disables the root filter entirely.
 *
 * One of the two boundaries where a path's spelling is settled; the other is the
 * cwd read out of a transcript, in `corpus.ts`.
 */
export function normalizeRoot(raw: string, windows = IS_WINDOWS): string {
  return stripTrailingSep(
    normalizeSeparators(expandTilde(raw.trim()), windows),
    windows,
  );
}
