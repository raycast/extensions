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

export interface Sheet {
  id: string;
  name: LocalizedText;
  match?: { bundleIDs?: string[]; processNames?: string[] };
  groups: SheetGroup[];
}

/** One flattened row, which is what the command actually renders. */
export interface Shortcut {
  id: string;
  title: string;
  keys: string;
  sheetId: string;
  sheetName: string;
  group: string;
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
      const parsed = JSON.parse(readFileSync(join(dir, name), "utf8")) as Sheet;
      if (parsed && typeof parsed.id === "string" && Array.isArray(parsed.groups)) {
        sheets.push(parsed);
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
        });
      }
    }
  }
  return rows;
}
