import { getPreferenceValues, trash } from "@raycast/api";
import { homedir } from "os";
import { promises as fs } from "fs";
import { existsSync, mkdirSync } from "fs";
import { join, basename, dirname } from "path";
import { randomUUID } from "crypto";

export interface NoteMeta {
  title: string;
  created: Date;
  filePath: string;
  mtime: Date;
  folder: string;
  body: string;
}

export function getNotesDirectory(): string {
  const { notesDirectory } = getPreferenceValues<Preferences>();
  const dir = notesDirectory.replace(/^~/, homedir());
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Matches the main Stik app slug algorithm:
 * keep alphanumeric + spaces, take first 5 words, join with hyphens, lowercase, max 40 chars
 */
export function slugify(text: string): string {
  return text
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)
    .join("-")
    .toLowerCase()
    .substring(0, 40)
    .replace(/-+$/, "");
}

/**
 * Generates a filename matching the main app: YYYYMMDD-HHMMSS-slug-xxxx.md
 */
export function generateFilename(content: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const timestamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
  ].join("");
  const time = [
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");
  const slug = slugify(content) || "untitled";
  const suffix = randomUUID().substring(0, 4);
  return `${timestamp}-${time}-${slug}-${suffix}.md`;
}

/**
 * Extracts title from the first non-empty line of content (matches main app behavior).
 */
export function extractTitle(content: string): string {
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && trimmed !== "<br>") {
      return trimmed.replace(/^#+\s*/, "").substring(0, 120);
    }
  }
  return "Untitled";
}

/**
 * Parses created date from the YYYYMMDD-HHMMSS filename prefix.
 */
export function parseCreatedFromFilename(filename: string): Date | null {
  const match = filename.match(/^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})/);
  if (!match) return null;
  const [, y, mo, d, h, mi, s] = match;
  return new Date(+y, +mo - 1, +d, +h, +mi, +s);
}

/**
 * Strips legacy YAML frontmatter (from old Raycast extension notes).
 * Returns extracted title and body without frontmatter.
 */
function stripFrontmatter(raw: string): { title: string; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { title: "", body: raw };
  const fm = match[1];
  const body = match[2];
  const titleMatch = fm.match(/^title:\s*(.+)$/m);
  return { title: titleMatch ? titleMatch[1].trim() : "", body };
}

export async function readNote(filePath: string): Promise<NoteMeta> {
  const raw = await fs.readFile(filePath, "utf-8");
  const stat = await fs.stat(filePath);
  const filename = basename(filePath);
  const notesDir = getNotesDirectory();
  const parentDir = dirname(filePath);
  const folder = parentDir === notesDir ? "" : basename(parentDir);

  const { title: fmTitle, body: fmBody } = stripFrontmatter(raw);
  const hasFrontmatter = raw.startsWith("---\n") || raw.startsWith("---\r\n");

  const body = hasFrontmatter ? fmBody : raw;
  const title = fmTitle || extractTitle(body) || filename.replace(/\.md$/, "");
  const created = parseCreatedFromFilename(filename) || stat.mtime;

  return { title, created, filePath, mtime: stat.mtime, folder, body };
}

export async function listFolders(): Promise<string[]> {
  const dir = getNotesDirectory();
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();
}

export async function getAllNotes(): Promise<NoteMeta[]> {
  const dir = getNotesDirectory();
  const notes: NoteMeta[] = [];

  const entries = await fs.readdir(dir, { withFileTypes: true });

  // Root-level .md files
  for (const e of entries) {
    if (e.isFile() && e.name.endsWith(".md")) {
      try {
        notes.push(await readNote(join(dir, e.name)));
      } catch {
        /* skip unreadable files */
      }
    }
  }

  // Folder-level .md files
  for (const e of entries) {
    if (!e.isDirectory() || e.name.startsWith(".")) continue;
    try {
      const folderEntries = await fs.readdir(join(dir, e.name), {
        withFileTypes: true,
      });
      for (const f of folderEntries) {
        if (f.isFile() && f.name.endsWith(".md")) {
          try {
            notes.push(await readNote(join(dir, e.name, f.name)));
          } catch {
            /* skip */
          }
        }
      }
    } catch {
      /* skip unreadable folders */
    }
  }

  return notes;
}

export async function deleteNote(filePath: string): Promise<void> {
  await trash(filePath);
}

export async function moveNote(
  filePath: string,
  targetFolder: string,
): Promise<string> {
  const dir = getNotesDirectory();
  const filename = basename(filePath);
  const targetDir = targetFolder ? join(dir, targetFolder) : dir;
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }
  const newPath = join(targetDir, filename);
  await fs.rename(filePath, newPath);
  return newPath;
}
