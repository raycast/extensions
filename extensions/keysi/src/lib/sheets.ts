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
 * Resolves a `LocalizedText` against the user's preferred languages.
 *
 * Deliberately mirrors `LocalizedText.resolved` rather than just taking
 * `en`: someone running macOS in German who wrote a German sheet should see
 * German here too. Falls back through the base language ("pt" for "pt-BR"),
 * then English, then whatever is there — never empty, because an empty row
 * in a search list is worse than a row in the wrong language.
 */
export function resolve(text: LocalizedText, preferences: string[] = preferredLanguages()): string {
  if (typeof text === "string") return text;
  const keys = Object.keys(text);
  if (keys.length === 0) return "";
  for (const pref of preferences) {
    if (text[pref]) return text[pref];
    const base = pref.split("-")[0];
    const match = keys.find((k) => k === base || k.split("-")[0] === base);
    if (match && text[match]) return text[match];
  }
  return text["en"] ?? text[keys.sort()[0]];
}

function preferredLanguages(): string[] {
  // Intl reports the resolved locale for this process, which on macOS
  // follows the user's language order.
  try {
    return [Intl.DateTimeFormat().resolvedOptions().locale, "en"];
  } catch {
    return ["en"];
  }
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
export function loadSheets(
  builtinDirs: string[] = BUILTIN_SHEET_DIRS,
  userDir: string = USER_SHEETS_DIR,
): Sheet[] {
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
