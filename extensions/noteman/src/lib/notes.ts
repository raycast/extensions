import { readdir, rename, stat } from "node:fs/promises";
import path from "node:path";
import {
  appendToFile,
  ensureDirExists,
  ensureUniqueFilename,
  readFileUtf8,
  writeFileUtf8Exclusive,
} from "./fs";

export type NoteFile = {
  path: string;
  filename: string;
  title: string;
  content: string;
  characterCount: number;
  mtimeMs: number;
  isDaily: boolean;
  isToday: boolean;
};

export type NoteListItem = Omit<NoteFile, "content" | "characterCount">;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDateYYYYMMDD(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function humanizeSlug(value: string): string {
  const words = value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));

  if (words.length === 0) {
    return "Untitled";
  }

  return words.join(" ");
}

function isDailyFilename(filename: string): boolean {
  return /^\d{4}-\d{2}-\d{2}\.md$/i.test(filename);
}

export function slugify(title: string): string {
  const normalized = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || "untitled";
}

export function getDailyFilename(date = new Date()): string {
  return `${formatDateYYYYMMDD(date)}.md`;
}

export function formatTimeHHmm(date = new Date()): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function parseTitleFromContentOrFilename(
  filePath: string,
  content: string,
): string {
  const headingMatch = content.match(/^#\s+(.+)\s*$/m);
  if (headingMatch?.[1]) {
    return headingMatch[1].trim();
  }

  const filename = path.basename(filePath, ".md");
  const regularNoteMatch = filename.match(
    /^\d{4}-\d{2}-\d{2}\s\d{4}\s-\s(.+)$/,
  );

  if (regularNoteMatch?.[1]) {
    return humanizeSlug(regularNoteMatch[1]);
  }

  return humanizeSlug(filename);
}

export function countCharacters(content: string): number {
  return content.length;
}

export async function listMarkdownFiles(
  notesDir: string,
  onReadError?: (filename: string, error: unknown) => void,
): Promise<NoteFile[]> {
  await ensureDirExists(notesDir);

  const entries = await readdir(notesDir, { withFileTypes: true });
  const markdownEntries = entries.filter(
    (entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"),
  );
  const todayFilename = getDailyFilename();

  const notes = await Promise.all(
    markdownEntries.map(async (entry) => {
      const filePath = path.join(notesDir, entry.name);

      try {
        const [content, fileStats] = await Promise.all([
          readFileUtf8(filePath),
          stat(filePath),
        ]);

        return {
          path: filePath,
          filename: entry.name,
          title: parseTitleFromContentOrFilename(filePath, content),
          content,
          characterCount: countCharacters(content),
          mtimeMs: fileStats.mtimeMs,
          isDaily: isDailyFilename(entry.name),
          isToday: entry.name === todayFilename,
        } satisfies NoteFile;
      } catch (error) {
        onReadError?.(entry.name, error);
        return null;
      }
    }),
  );

  return notes
    .filter((note): note is NoteFile => note !== null)
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}

export async function listMarkdownFileMetadata(
  notesDir: string,
  onReadError?: (filename: string, error: unknown) => void,
): Promise<NoteListItem[]> {
  await ensureDirExists(notesDir);

  const entries = await readdir(notesDir, { withFileTypes: true });
  const markdownEntries = entries.filter(
    (entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"),
  );
  const todayFilename = getDailyFilename();

  const notes = await Promise.all(
    markdownEntries.map(async (entry) => {
      const filePath = path.join(notesDir, entry.name);

      try {
        const fileStats = await stat(filePath);
        // Title resolution strategy:
        // - For filenames that match the extension's own created pattern
        //   (e.g. "YYYY-MM-DD HHmm - slug.md"), we derive the visible
        //   title from the slug rather than reading the file's H1 heading.
        //   This keeps the Browse Notes list stable when users rename the
        //   note via the UI. The tradeoff is that if a user edits the
        //   H1 heading in an external editor, the list will not reflect
        //   that change — the title remains derived from the filename's
        //   slug. This is an intentional design decision and not a bug.
        const shouldReadForTitle =
          !isDailyFilename(entry.name) &&
          !/^\d{4}-\d{2}-\d{2}\s\d{4}\s-\s.+\.md$/i.test(entry.name);
        const contentForTitle = shouldReadForTitle
          ? await readFileUtf8(filePath)
          : "";

        return {
          path: filePath,
          filename: entry.name,
          title: parseTitleFromContentOrFilename(filePath, contentForTitle),
          mtimeMs: fileStats.mtimeMs,
          isDaily: isDailyFilename(entry.name),
          isToday: entry.name === todayFilename,
        } satisfies NoteListItem;
      } catch (error) {
        onReadError?.(entry.name, error);
        return null;
      }
    }),
  );

  return notes
    .filter((note): note is NoteListItem => note !== null)
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}

export async function getNoteByPath(notePath: string): Promise<NoteFile> {
  const [content, fileStats] = await Promise.all([
    readFileUtf8(notePath),
    stat(notePath),
  ]);
  const filename = path.basename(notePath);

  return {
    path: notePath,
    filename,
    title: parseTitleFromContentOrFilename(notePath, content),
    content,
    characterCount: countCharacters(content),
    mtimeMs: fileStats.mtimeMs,
    isDaily: isDailyFilename(filename),
    isToday: filename === getDailyFilename(),
  };
}

async function writeUniqueFile(
  dir: string,
  baseFilename: string,
  content: string,
): Promise<string> {
  const extension = path.extname(baseFilename);
  const basename = path.basename(baseFilename, extension);

  let attempt = 1;
  while (true) {
    const candidate =
      attempt === 1 ? baseFilename : `${basename}-${attempt}${extension}`;
    const filePath = path.join(dir, candidate);

    try {
      await writeFileUtf8Exclusive(filePath, content);
      return filePath;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "EEXIST") {
        attempt += 1;
        continue;
      }

      throw error;
    }
  }
}

export async function createDailyIfMissing(
  notesDir: string,
  date = new Date(),
): Promise<string> {
  await ensureDirExists(notesDir);

  const dailyFilename = getDailyFilename(date);
  const dailyPath = path.join(notesDir, dailyFilename);

  try {
    await writeFileUtf8Exclusive(
      dailyPath,
      `# ${formatDateYYYYMMDD(date)}\n\n`,
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
      throw error;
    }
  }

  return dailyPath;
}

export async function appendDailyEntry(
  notesDir: string,
  text: string,
  date = new Date(),
): Promise<string> {
  const cleanText = text.trim();
  const dailyPath = await createDailyIfMissing(notesDir, date);

  if (!cleanText) {
    return dailyPath;
  }

  const existingContent = await readFileUtf8(dailyPath);
  const separator =
    existingContent.length === 0
      ? ""
      : existingContent.endsWith("\n")
        ? ""
        : "\n";
  const entry = `- ${formatTimeHHmm(date)} ${cleanText}\n`;

  await appendToFile(dailyPath, `${separator}${entry}`);
  return dailyPath;
}

export async function createNewNoteFile(
  notesDir: string,
  title: string,
  content: string,
  date = new Date(),
): Promise<string> {
  await ensureDirExists(notesDir);

  const trimmedTitle = title.trim();
  const trimmedContent = content.trim();
  const filename = `${formatDateYYYYMMDD(date)} ${formatTimeHHmm(date).replace(":", "")} - ${slugify(trimmedTitle)}.md`;

  const fileContent = trimmedContent
    ? `# ${trimmedTitle}\n\n${trimmedContent.replace(/\s+$/, "")}\n`
    : `# ${trimmedTitle}\n\n`;

  return writeUniqueFile(notesDir, filename, fileContent);
}

export async function duplicateNoteFile(sourcePath: string): Promise<string> {
  const directory = path.dirname(sourcePath);
  const extension = path.extname(sourcePath);
  const basename = path.basename(sourcePath, extension);

  const content = await readFileUtf8(sourcePath);
  return writeUniqueFile(directory, `${basename} copy${extension}`, content);
}

export async function renameNoteFromTitleIfNeeded(
  notePath: string,
  newTitle: string,
): Promise<string> {
  const filename = path.basename(notePath);
  const extension = path.extname(filename);

  if (extension.toLowerCase() !== ".md" || isDailyFilename(filename)) {
    return notePath;
  }

  const base = path.basename(filename, extension);
  const match = base.match(/^(\d{4}-\d{2}-\d{2}\s\d{4})\s-\s(.+)$/);

  if (!match) {
    return notePath;
  }

  const prefix = match[1];
  const nextFilename = `${prefix} - ${slugify(newTitle)}.md`;

  if (nextFilename === filename) {
    return notePath;
  }

  const directory = path.dirname(notePath);
  const uniqueFilename = await ensureUniqueFilename(directory, nextFilename);
  const nextPath = path.join(directory, uniqueFilename);

  await rename(notePath, nextPath);
  return nextPath;
}

export function syncTitleInMarkdown(content: string, title: string): string {
  const cleanTitle = title.trim();
  const normalized = content.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const firstContentLine = lines.findIndex((line) => line.trim().length > 0);

  if (firstContentLine >= 0 && /^#\s+/.test(lines[firstContentLine])) {
    lines[firstContentLine] = `# ${cleanTitle}`;
    const updated = lines.join("\n").replace(/\s+$/, "");
    return `${updated}\n`;
  }

  const body = normalized.trim();
  if (!body) {
    return `# ${cleanTitle}\n\n`;
  }

  return `# ${cleanTitle}\n\n${body}\n`;
}
