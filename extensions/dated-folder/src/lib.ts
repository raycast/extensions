import { execFile } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { join, resolve, sep } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Folder name
// ---------------------------------------------------------------------------

const TOKENS: Record<string, (date: Date) => number> = {
  yyyy: (d) => d.getFullYear(),
  MM: (d) => d.getMonth() + 1,
  dd: (d) => d.getDate(),
  HH: (d) => d.getHours(),
  mm: (d) => d.getMinutes(),
  ss: (d) => d.getSeconds(),
};

/**
 * Expands the date tokens in `format`. Text wrapped in single quotes is kept literally, which is
 * what makes names like `'summer'-yyyy` work: without the escape the `mm` inside `summer` reads as
 * minutes, and every `dd`, `MM`, `HH` or `ss` sitting in an ordinary word turns into a number with
 * nothing to warn the user. `''` yields a single quote, following the usual LDML convention.
 */
export function formatDate(format: string, date: Date): string {
  return format.replace(/'((?:[^']|'')*)'|yyyy|MM|dd|HH|mm|ss/g, (token, literal?: string) =>
    literal === undefined ? String(TOKENS[token](date)).padStart(2, "0") : literal.replace(/''/g, "'") || "'",
  );
}

/**
 * Resolves `name` inside `parent`. `/` in the name is allowed so `yyyy/MM/dd` builds a
 * hierarchy, but the result must stay below the parent — returns null for `..`, absolute
 * paths, or anything else that would escape it.
 */
export function resolveInside(parent: string, name: string): string | null {
  const base = resolve(parent);
  const target = resolve(base, name);
  // The root folder already ends in a separator, and appending a second one would make every
  // target fail the containment check. The explicit `target !== base` keeps the parent itself
  // out: with a root parent the prefix *is* the parent, so a name like `..` would pass.
  const prefix = base.endsWith(sep) ? base : base + sep;
  return target !== base && target.startsWith(prefix) ? target : null;
}

/**
 * Shortens a path under the home folder to `~/…` for display. Compares whole segments, so a
 * sibling that merely starts with the same characters — `/Users/anna-old` next to `/Users/anna`
 * — is left alone instead of being mangled into `~-old`.
 */
export function tildify(path: string): string {
  const home = homedir();
  return path === home || path.startsWith(home + sep) ? `~${path.slice(home.length)}` : path;
}

// ---------------------------------------------------------------------------
// Default parent folder
// ---------------------------------------------------------------------------

export function defaultParentDir(): string {
  return join(homedir(), "Desktop", "temp");
}

// ---------------------------------------------------------------------------
// macOS: system default terminal
// ---------------------------------------------------------------------------

export const FALLBACK_TERMINAL_BUNDLE = "com.apple.Terminal";

const LS_PREFS = join(homedir(), "Library/Preferences/com.apple.LaunchServices/com.apple.launchservices.secure.plist");

/**
 * macOS has no "default terminal" setting in System Settings, but LaunchServices stores the
 * shell-role handler for `public.unix-executable`. That is exactly what terminal apps write when
 * they ask "make this your default terminal?" on first launch, so it is the value to follow.
 */
export async function defaultTerminalBundleId(): Promise<string> {
  if (!existsSync(LS_PREFS)) return FALLBACK_TERMINAL_BUNDLE;
  try {
    const { stdout } = await execFileAsync("/usr/bin/plutil", ["-convert", "json", "-o", "-", LS_PREFS]);
    return currentShellHandler(JSON.parse(stdout).LSHandlers) ?? FALLBACK_TERMINAL_BUNDLE;
  } catch {
    return FALLBACK_TERMINAL_BUNDLE;
  }
}

/**
 * Picks the shell-role handler for `public.unix-executable` from the LSHandlers array. The file
 * can carry several records for the same content type (LaunchServices rewrites are not always
 * deduplicated), so the one with the newest `LSHandlerModificationDate` wins — that is the
 * terminal the user chose most recently, not merely the first record in the file.
 */
export function currentShellHandler(handlers: unknown): string | undefined {
  if (!Array.isArray(handlers)) return undefined;
  const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
  const shellHandlers = handlers.filter(
    (h): h is Record<string, unknown> =>
      isRecord(h) && h.LSHandlerContentType === "public.unix-executable" && typeof h.LSHandlerRoleShell === "string",
  );
  const modified = (h: Record<string, unknown>) =>
    typeof h.LSHandlerModificationDate === "number" ? h.LSHandlerModificationDate : 0;
  const newest = shellHandlers.sort((a, b) => modified(b) - modified(a))[0];
  return newest?.LSHandlerRoleShell as string | undefined;
}
