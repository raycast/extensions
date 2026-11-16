import { getPreferenceValues, open, showHUD, showToast, Toast } from "@raycast/api";
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

const SKIPPED = new Set([".git", ".obsidian", ".trash", ".coffee", "node_modules", "attachments"]);
const LIMIT = 5000;

/** The folder of notes: the one chosen in the extension, or else the one Coffee is set to. */
export function notesFolder(): string | undefined {
  const chosen = getPreferenceValues<{ notesFolder?: string }>().notesFolder;
  if (chosen && existsSync(chosen)) return chosen;
  try {
    const path = execFileSync("/usr/bin/defaults", ["read", "app.coffee.mac", "libraryPath"], {
      encoding: "utf8",
    }).trim();
    if (path && existsSync(path)) return path;
  } catch {
    // Coffee hasn't been set up yet, or isn't installed.
  }
  const fallback = join(homedir(), "Documents", "Coffee");
  return existsSync(fallback) ? fallback : undefined;
}

/** Every .md, .markdown and .txt note under the folder, the most recently changed first. */
export function listNotes(root: string): Note[] {
  const notes: Note[] = [];
  const walk = (dir: string) => {
    if (notes.length >= LIMIT) return;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      if (name.startsWith(".") || SKIPPED.has(name)) continue;
      const path = join(dir, name);
      let info;
      try {
        info = statSync(path);
      } catch {
        continue;
      }
      if (info.isDirectory()) walk(path);
      else if (/\.(md|markdown|txt)$/i.test(name)) {
        const folder = relative(root, dir);
        notes.push({ title: name.replace(/\.(md|markdown|txt)$/i, ""), path, folder, modified: info.mtime });
      }
    }
  };
  walk(root);
  return notes.sort((a, b) => b.modified.getTime() - a.modified.getTime());
}

/** The note's text, for reading in Raycast, without its front matter. */
export function readNote(path: string): string {
  try {
    const text = readFileSync(path, "utf8");
    return text.replace(/^---\n[\s\S]*?\n---\n/, "").slice(0, 20000);
  } catch {
    return "";
  }
}

/** Runs one of Coffee's own links, coffee://new, inbox, open, search or today. */
export async function runCoffee(action: string, values: Record<string, string> = {}) {
  const query = new URLSearchParams(values).toString();
  try {
    await open(`coffee://${action}${query ? `?${query}` : ""}`);
    return true;
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Coffee isn't installed",
      message: "Get it at coffeetext.app",
    });
    return false;
  }
}

export async function openInCoffee(path: string) {
  try {
    await open(path, "app.coffee.mac");
  } catch {
    await showHUD("Coffee couldn't open that note");
  }
}
