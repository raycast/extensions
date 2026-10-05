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
  // The type says string-or-map, but the value came out of a JSON file
  // someone may have written by hand. Anything else — a missing field, a
  // number, an array — resolves to "" rather than throwing, and the callers
  // treat "" as "not usable".
  if (text === null || typeof text !== "object" || Array.isArray(text)) return "";
  const variants: Record<string, string> = {};
  for (const [tag, value] of Object.entries(text)) {
    if (typeof value === "string" && value.length > 0) variants[tag] = value;
  }
  const keys = Object.keys(variants).sort();
  if (keys.length === 0) return "";
  if (variants["en"]) return variants["en"];
  const englishVariant = keys.find((k) => k.split("-")[0] === "en");
  if (englishVariant) return variants[englishVariant];
  return variants[keys[0]];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Whether a parsed file has the shape `flatten` and `matching` rely on.
 *
 * The same fields Keysi's `CustomSheet` decoder requires — an id, a name,
 * groups with titles, items with titles — so a sheet Keysi would refuse to
 * load is refused here too, and dropped the same way unparseable JSON is,
 * instead of reaching `flatten` and taking the whole list down with it.
 * `match` is the exception: it is required in Swift, but here a sheet
 * without one simply never floats to the top, which costs nothing.
 */
export function isSheet(value: unknown): value is Sheet {
  if (!isObject(value)) return false;
  if (typeof value.id !== "string" || value.id.length === 0) return false;
  if (!resolve(value.name as LocalizedText)) return false;
  if (value.match !== undefined && !isObject(value.match)) return false;
  if (!Array.isArray(value.groups)) return false;
  return value.groups.every(
    (group) =>
      isObject(group) &&
      resolve(group.title as LocalizedText) !== "" &&
      Array.isArray(group.items) &&
      group.items.every(
        (item) =>
          isObject(item) &&
          resolve(item.title as LocalizedText) !== "" &&
          (item.keys === undefined || typeof item.keys === "string"),
      ),
  );
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
      const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
      if (isSheet(parsed)) sheets.push({ ...parsed, sourcePath: path });
    } catch {
      // One malformed file must not take the whole list down — whether it is
      // unparseable JSON or valid JSON in the wrong shape. Keysi itself
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

/**
 * Flattens sheets into the rows the list renders.
 *
 * `readSheetsIn` already refuses a badly shaped sheet, but this is exported
 * and runs unguarded in the command, so it does not throw on one either: a
 * group or item that is not an object is skipped, and so is a row with no
 * title, since a blank row is unselectable and unfindable.
 */
export function flatten(sheets: Sheet[]): Shortcut[] {
  const rows: Shortcut[] = [];
  const seen = new Set<string>();
  for (const sheet of sheets) {
    const sheetName = resolve(sheet.name);
    for (const group of Array.isArray(sheet.groups) ? sheet.groups : []) {
      if (!isObject(group)) continue;
      const groupTitle = resolve(group.title);
      for (const item of Array.isArray(group.items) ? group.items : []) {
        if (!isObject(item)) continue;
        const title = resolve(item.title);
        if (!title) continue;
        const id = `${sheet.id}›${groupTitle}›${title}`;
        if (seen.has(id)) continue;
        seen.add(id);
        rows.push({
          id,
          title,
          keys: typeof item.keys === "string" ? item.keys : "",
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
      const bundleIDs = Array.isArray(match.bundleIDs) ? match.bundleIDs : [];
      const processNames = Array.isArray(match.processNames) ? match.processNames : [];
      if (app.bundleId && bundleIDs.includes(app.bundleId)) return true;
      return processNames.some((process) => typeof process === "string" && names.has(process.toLowerCase()));
    })
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}
