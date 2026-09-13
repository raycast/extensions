import { homedir } from "os";
import { join } from "path";
import { readdirSync, readFileSync, statSync } from "fs";

/**
 * A `LocalizedText` from Keysi's sheet format: either a bare string, or a
 * map of BCP-47 tag to string.
 */
export type LocalizedText = string | Record<string, string>;

export interface SheetItem {
  title: LocalizedText;
  keys?: string;
  raw?: boolean;
}

export interface SheetGroup {
  title: LocalizedText;
  items: SheetItem[];
}

export interface SheetMatch {
  bundleIDs?: string[];
  processNames?: string[];
}

export interface Sheet {
  id: string;
  name: LocalizedText;
  match?: SheetMatch;
  /** Higher wins when several sheets match the same app. Defaults to 0. */
  priority?: number;
  groups: SheetGroup[];
  /**
   * Where this sheet was read from. Not part of Keysi's format — added on
   * load so a row can offer to open the file that produced it, which is the
   * fastest route from "this is wrong" to fixing it.
   */
  sourcePath?: string;
}

/** One flattened row, which is what the command actually renders. */
export interface Shortcut {
  id: string;
  title: string;
  keys: string;
  sheetId: string;
  sheetName: string;
  group: string;
  /** The file this row came from, when it is known. */
  sourcePath?: string;
}

/**
 * Where the app keeps user-authored sheets. Mirrors
 * `CustomSheetStore.userSheetsDirectory`; if that constant ever moves, this
 * is the other half that has to move with it.
 */
export const USER_SHEETS_DIR = join(homedir(), "Library", "Application Support", "Keysi", "Sheets");

/**
 * Built-in sheets ship inside the app bundle. Both common install locations
 * are checked because Keysi is distributed as a direct download — plenty of
 * people run it straight out of ~/Applications.
 */
export const BUILTIN_SHEET_DIRS = [
  "/Applications/Keysi.app/Contents/Resources/BuiltinSheets",
  join(homedir(), "Applications", "Keysi.app", "Contents", "Resources", "BuiltinSheets"),
];

/**
 * Picks one string out of a `LocalizedText`.
 *
 * Something has to: the sheet format allows either a bare string or a map of
 * BCP-47 tag to string, so a map rendered directly would show
 * "[object Object]". This is that, and nothing more.
 *
 * **English first, deliberately.** An earlier version read the system locale
 * via `Intl` and matched the user's language, mirroring `LocalizedText.resolved`
 * on Keysi's Swift side. Raycast's store guidelines say extensions support US
 * English only and to avoid custom localization, and that rule is right here
 * even setting the rule aside: every other string this command renders — the
 * search placeholder, the action names, the empty state — is English, so
 * resolving rows to German produced a half-German list rather than a German
 * one. Keysi's own overlay still localizes properly; this is the Raycast
 * surface and it is English.
 *
 * The fallback order is English, then the first tag in sorted order, so the
 * result is deterministic rather than dependent on JSON key order. Never
 * returns empty for a non-empty map: a blank row is unselectable in the list
 * and unfindable by search.
 */
export function resolve(text: LocalizedText): string {
  if (typeof text === "string") return text;
  const keys = Object.keys(text);
  if (keys.length === 0) return "";
  if (text["en"]) return text["en"];
  const englishVariant = keys.sort().find((k) => k.split("-")[0] === "en");
  if (englishVariant) return text[englishVariant];
  return text[keys.sort()[0]] ?? "";
}

export function readSheetsIn(dir: string): Sheet[] {
  let names: string[];
  try {
    if (!statSync(dir).isDirectory()) return [];
    names = readdirSync(dir);
  } catch {
    // A missing directory is the normal case, not an error: a user who has
    // never written a sheet has no sheets folder.
    return [];
  }
  const sheets: Sheet[] = [];
  for (const name of names) {
    if (!name.toLowerCase().endsWith(".json")) continue;
    try {
      const path = join(dir, name);
      const parsed = JSON.parse(readFileSync(path, "utf8")) as Sheet;
      if (parsed && typeof parsed.id === "string" && Array.isArray(parsed.groups)) {
        sheets.push({ ...parsed, sourcePath: path });
      }
    } catch {
      // One malformed file must not take the whole list down. Keysi itself
      // surfaces load errors in Settings; this is a reader, not the editor.
      continue;
    }
  }
  return sheets;
}

/**
 * Every sheet, with user sheets shadowing built-ins of the same id — the
 * same precedence `CustomSheetStore` applies, so overriding the bundled Vim
 * sheet has the same effect in both places.
 */
export function loadSheets(builtinDirs: string[] = BUILTIN_SHEET_DIRS, userDir: string = USER_SHEETS_DIR): Sheet[] {
  const byId = new Map<string, Sheet>();
  for (const dir of builtinDirs) {
    for (const sheet of readSheetsIn(dir)) byId.set(sheet.id, sheet);
  }
  // Last write wins, so user sheets shadow built-ins of the same id.
  for (const sheet of readSheetsIn(userDir)) byId.set(sheet.id, sheet);
  return [...byId.values()];
}

/** Flattens sheets into the rows the list renders. */
export function flatten(sheets: Sheet[]): Shortcut[] {
  const rows: Shortcut[] = [];
  const seen = new Set<string>();
  for (const sheet of sheets) {
    const sheetName = resolve(sheet.name);
    for (const group of sheet.groups ?? []) {
      const groupTitle = resolve(group.title);
      for (const item of group.items ?? []) {
        const title = resolve(item.title);
        if (!title) continue;
        const id = `${sheet.id}›${groupTitle}›${title}`;
        if (seen.has(id)) continue;
        seen.add(id);
        rows.push({
          id,
          title,
          keys: item.keys ?? "",
          sheetId: sheet.id,
          sheetName,
          group: groupTitle,
          sourcePath: sheet.sourcePath,
        });
      }
    }
  }
  return rows;
}

/**
 * The app a sheet is about, in the only terms a Raycast extension can learn
 * them: `getFrontmostApplication()` gives a bundle id, a name and a path,
 * and nothing else.
 */
export interface TargetApp {
  bundleId?: string;
  name?: string;
  path?: string;
}

/**
 * Launchers, which are not what the user was doing.
 *
 * The same three `TargetAppFilter.launcherBundleIDs` excludes on Keysi's
 * side, and for the same reason: they are `LSUIElement` agents, which reads
 * like "invisible to activation" and is not. Whether `getFrontmostApplication()`
 * reports Raycast itself or the app behind it is Raycast's business and has
 * changed before; this makes the answer not matter, because the only thing
 * riding on it is which section floats to the top.
 */
export const LAUNCHER_BUNDLE_IDS = ["com.raycast.macos", "com.runningwithcrayons.Alfred", "at.obdev.LaunchBar"];

/**
 * The sheets that are about `app`, best first.
 *
 * Mirrors `CustomSheetStore.matching` — bundle id or process name, sorted by
 * priority descending — so a sheet that wins in Keysi's overlay wins here.
 *
 * The process-name half is weaker here than it is there, and deliberately
 * not faked. Keysi reads the processes running *inside* the frontmost
 * terminal, which is how its Vim and tmux sheets appear when you are in
 * Ghostty; an extension cannot see that. What is left is the app's own name
 * and bundle path, which catches an editor literally called `nvim` and
 * misses tmux inside Terminal. Matching on "it's a terminal, so probably
 * Vim" would be guessing, and guessing wrong reorders someone's list for no
 * reason they can see.
 */
export function matching(sheets: Sheet[], app: TargetApp | undefined): Sheet[] {
  if (!app) return [];
  if (app.bundleId && LAUNCHER_BUNDLE_IDS.includes(app.bundleId)) return [];

  const names = new Set(
    [
      app.name,
      app.path
        ?.split("/")
        .pop()
        ?.replace(/\.app$/i, ""),
    ]
      .filter((n): n is string => typeof n === "string" && n.length > 0)
      .map((n) => n.toLowerCase()),
  );

  return sheets
    .filter((sheet) => {
      const match = sheet.match;
      if (!match) return false;
      if (app.bundleId && (match.bundleIDs ?? []).includes(app.bundleId)) return true;
      return (match.processNames ?? []).some((process) => names.has(process.toLowerCase()));
    })
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}
