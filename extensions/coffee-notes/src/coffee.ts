import { getPreferenceValues, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, relative } from "node:path";

/** A note in the folder: its title (the file's name), where it is, and when it last changed. */
export interface Note {
  title: string;
  path: string;
  folder: string;
  modified: Date;
}

/** Where the notes are, or why there's no folder to read. */
export type NotesFolder = { path: string } | { problem: string; fixInPreferences: boolean };

/** Coffee's own icon: the app's, or the extension's copy of it when the app isn't in /Applications. */
export const COFFEE = existsSync("/Applications/Coffee.app")
  ? { fileIcon: "/Applications/Coffee.app" }
  : "extension-icon.png";

const SKIPPED = new Set([".git", ".obsidian", ".trash", ".coffee", "node_modules", "attachments"]);
/** How many notes the list shows: the most recently changed, whatever order the folders are walked in. */
const LIMIT = 5000;
/** How much of a note the preview shows. Copying always takes the whole note. */
export const PREVIEW_LIMIT = 20000;

/**
 * The folder of notes: the one chosen in the extension's preferences, or else the one Coffee is set to.
 * A chosen folder that isn't there is reported, never swapped for another library.
 */
export function notesFolder(): NotesFolder {
  const chosen = getPreferenceValues<Preferences>().notesFolder;
  if (chosen) {
    return existsSync(chosen)
      ? { path: chosen }
      : { problem: `The folder chosen in preferences isn't there: ${chosen}`, fixInPreferences: true };
  }
  try {
    const path = execFileSync("/usr/bin/defaults", ["read", "app.coffee.mac", "libraryPath"], {
      encoding: "utf8",
    }).trim();
    if (path) {
      return existsSync(path)
        ? { path }
        : {
            problem: `Coffee's notes folder isn't there: ${path}. Open Coffee to choose it again.`,
            fixInPreferences: false,
          };
    }
  } catch {
    // Coffee hasn't been set up yet, or isn't installed: its first folder is the usual one.
  }
  const usual = join(homedir(), "Documents", "Coffee");
  if (existsSync(usual)) return { path: usual };
  return {
    problem:
      "No notes folder found. Open Coffee once to choose a folder, or choose one in this extension's preferences.",
    fixInPreferences: true,
  };
}

/**
 * Every .md, .markdown and .txt note under the folder, the most recently changed first.
 * Throws when the folder itself can't be read, so that shows as an error and not as an empty library.
 * A subfolder that can't be read is left out.
 */
export function listNotes(root: string): Note[] {
  const notes: Note[] = [];
  const walk = (dir: string, entries: string[]) => {
    for (const name of entries) {
      if (name.startsWith(".") || SKIPPED.has(name)) continue;
      const path = join(dir, name);
      let info;
      try {
        info = statSync(path);
      } catch {
        continue;
      }
      if (info.isDirectory()) {
        let inside: string[];
        try {
          inside = readdirSync(path);
        } catch {
          continue;
        }
        walk(path, inside);
      } else if (/\.(md|markdown|txt)$/i.test(name)) {
        notes.push({
          title: name.replace(/\.(md|markdown|txt)$/i, ""),
          path,
          folder: relative(root, dir),
          modified: info.mtime,
        });
      }
    }
  };
  walk(root, readdirSync(root));
  // Every note is looked at, then the newest kept: a cap during the walk would drop recent notes in later folders.
  return notes.sort((a, b) => b.modified.getTime() - a.modified.getTime()).slice(0, LIMIT);
}

/** The note's whole text, as it is in the file. Throws if the file can't be read. */
export function readNote(path: string): string {
  return readFileSync(path, "utf8");
}

/** The note for reading in Raycast: without its front matter, cut to the preview length, or why it can't be read. */
export function previewNote(path: string): string {
  try {
    const text = readNote(path).replace(/^---\n[\s\S]*?\n---\n/, "");
    return text.length > PREVIEW_LIMIT ? `${text.slice(0, PREVIEW_LIMIT)}\n\n…` : text;
  } catch (error) {
    return `**This note can't be read.**\n\n${error instanceof Error ? error.message : String(error)}`;
  }
}

/** Runs one of Coffee's own links, coffee://new, inbox, open, search or today. */
export async function runCoffee(action: string, values: Record<string, string> = {}) {
  const query = new URLSearchParams(values).toString();
  try {
    await open(`coffee://${action}${query ? `?${query}` : ""}`);
    return true;
  } catch (error) {
    await showFailureToast(error, { title: "Could Not Open Coffee" });
    return false;
  }
}

export async function openInCoffee(path: string) {
  try {
    await open(path, "app.coffee.mac");
  } catch (error) {
    await showFailureToast(error, { title: "Could Not Open the Note in Coffee" });
  }
}
