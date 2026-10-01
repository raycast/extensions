import { promises as fs } from "fs";
import * as path from "path";
import { straightenQuotes } from "./note-search";

export interface Note {
  id: string;
  title: string;
  /** Vault-relative path, e.g. "Journal/Fri 11 September.md". */
  relativePath: string;
  absolutePath: string;
  /** Frontmatter-stripped markdown, kept from the load rather than re-read when a note is
   *  selected. Reading it lazily meant the detail pane had an empty frame before the content
   *  arrived, which shifted the metadata rows below it on every selection change. The file was
   *  already being read in full here to build the search haystack, so holding onto it costs a
   *  copy in memory and saves the round trip entirely. */
  body: string;
  /** Search haystacks, folded and lowercased once here at load rather than per keystroke — which
   *  is what keeps typing responsive over a whole vault, since a query then costs one indexOf per
   *  note per term (see note-search.ts).
   *
   *  `bodyLower` is the FULL body with markdown syntax stripped, matching vault.ts's own
   *  bodyToPlainText exactly, so search reaches the whole note the same way the app's does. */
  titleLower: string;
  bodyLower: string;
  pinned: boolean;
  updatedAt: string;
}

interface NoteFrontmatter {
  id?: string;
  title?: string;
  pinned?: boolean;
  updatedAt?: string;
}

// Ported from main/handlers/vault.ts's parseFrontmatter/stripQuotes: a deliberately minimal,
// non-YAML flat `key: value` reader. Has to match exactly — a real YAML parser disagrees with it
// on unquoted values containing a colon.
function stripQuotes(value: string): string {
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function parseFrontmatter(content: string): NoteFrontmatter {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return {};
  const result: NoteFrontmatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    const rawValue = stripQuotes(line.slice(colonIndex + 1).trim());
    if (key === "id" && rawValue) result.id = rawValue;
    else if (key === "title") result.title = rawValue;
    else if (key === "pinned") result.pinned = rawValue === "true";
    else if (key === "updatedAt" && !Number.isNaN(Date.parse(rawValue))) result.updatedAt = rawValue;
  }
  return result;
}

const FRONTMATTER_BLOCK = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;

// Ported from main/handlers/vault.ts's bodyToPlainText — feeds search matching (loadNotes' own
// bodyLower field), same as it feeds the app's own vault:searchNotes, so this has to stay in step
// with what the app itself strips: the app matches against the FULL stripped body, not a preview,
// and note-search.ts relies on this producing the same haystack.
function bodyToPlainText(content: string): string {
  const body = content.replace(FRONTMATTER_BLOCK, "");
  return body
    .replace(/^```[^\n]*$/gm, "")
    .replace(/^[ \t]*\|?[ \t]*:?-{1,}:?[ \t]*(?:\|[ \t]*:?-{1,}:?[ \t]*)*\|?[ \t]*$/gm, "")
    .replace(/^[ \t]*\|?(.*\|.*)\|?[ \t]*$/gm, (_line, inner: string) =>
      inner
        .split(/(?<!\\)\|/)
        .map((cell) => cell.trim().replace(/\\\|/g, "|"))
        .filter(Boolean)
        .join(" "),
    )
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+(?:\[[ xX]\]\s*)?/gm, "")
    .replace(/^\s*\d+\.\s+(?:\[[ xX]\]\s*)?/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/<\/?(?:mark|ins|u)>/gi, "")
    .replace(/^[ \t]*<\/?details(?:\s[^>]*)?>[ \t]*$/gim, "")
    .replace(/<summary(?:\s[^>]*)?>([\s\S]*?)<\/summary>/gi, "$1")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Ported from collectNoteFiles: skip every dot-prefixed entry (that's where .markdownos lives),
// recurse into real directories, collect *.md case-insensitively.
async function collectNoteFiles(
  absoluteDir: string,
  relativeDir: string,
  into: { absolute: string; relative: string }[],
): Promise<void> {
  let entries;
  try {
    entries = await fs.readdir(absoluteDir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const entryRelativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      await collectNoteFiles(path.join(absoluteDir, entry.name), entryRelativePath, into);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      into.push({ absolute: path.join(absoluteDir, entry.name), relative: entryRelativePath });
    }
  }
}

async function readNote(file: { absolute: string; relative: string }): Promise<Note | null> {
  let content: string;
  try {
    content = await fs.readFile(file.absolute, "utf8");
  } catch {
    return null; // Deleted or unreadable mid-scan — skip it rather than fail the whole load.
  }
  const frontmatter = parseFrontmatter(content);
  const title = frontmatter.title ?? path.basename(file.relative, path.extname(file.relative));

  // Statted only when the note carries no updatedAt of its own, rather than for every note — a
  // second syscall per file is real cost across a vault, and most notes have the frontmatter.
  let updatedAt = frontmatter.updatedAt;
  if (!updatedAt) {
    try {
      updatedAt = (await fs.stat(file.absolute)).mtime.toISOString();
    } catch {
      return null;
    }
  }

  return {
    id: frontmatter.id ?? `path:${file.relative}`,
    title,
    relativePath: file.relative,
    absolutePath: file.absolute,
    body: stripFrontmatter(content),
    titleLower: straightenQuotes(title).toLowerCase(),
    bodyLower: straightenQuotes(bodyToPlainText(content)).toLowerCase(),
    pinned: frontmatter.pinned === true,
    updatedAt,
  };
}

// Reads are overwhelmingly I/O wait, so they go concurrently — a serial file-at-a-time loop is
// what made opening the command feel slow. Batched rather than one big Promise.all because
// opening every file in a large vault at once can exhaust file descriptors, and an EMFILE there
// would surface as notes silently missing from the list (readNote swallows its own read errors).
const READ_BATCH_SIZE = 64;

export async function loadNotes(vaultPath: string): Promise<Note[]> {
  const files: { absolute: string; relative: string }[] = [];
  await collectNoteFiles(vaultPath, "", files);

  const notes: Note[] = [];
  for (let i = 0; i < files.length; i += READ_BATCH_SIZE) {
    const batch = await Promise.all(files.slice(i, i + READ_BATCH_SIZE).map(readNote));
    for (const note of batch) {
      if (note) notes.push(note);
    }
  }
  return notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function stripFrontmatter(content: string): string {
  return content.replace(FRONTMATTER_BLOCK, "").trimStart();
}

/** Re-read from disk rather than using the loaded `body`, so an explicit "copy this note" hands
 *  over what the file says right now even if it changed since the list was built. */
export async function readNoteMarkdown(absolutePath: string): Promise<string> {
  return stripFrontmatter(await fs.readFile(absolutePath, "utf8"));
}

/** Matches note-link.ts's own encodeNoteLinkUrl exactly — only useful pasted back inside
 *  MarkdownOS's own editor (mdos-note: isn't an OS-registered scheme), but that's what "copy
 *  link" is for here. */
export function noteLinkMarkdown(note: Note): string {
  const rendererId = `vault:${note.id}`;
  const title = note.title.trim() || "Untitled";
  return `[${title}](mdos-note:${encodeURIComponent(rendererId)})`;
}
