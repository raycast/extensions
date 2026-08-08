import { Clipboard, getSelectedFinderItems } from "@raycast/api";
import { access, readFile, stat } from "node:fs/promises";
import { basename, extname, isAbsolute, resolve } from "node:path";

const MARKDOWN_EXTS = new Set([".md", ".markdown", ".mdown", ".mkd", ".mdx"]);

export interface MarkdownFileSource {
  path: string;
  markdown: string;
  fileName: string;
}

function isMarkdownPath(filePath: string): boolean {
  return MARKDOWN_EXTS.has(extname(filePath).toLowerCase());
}

function normalizeMaybeFileUrl(raw: string): string {
  const trimmed = raw.trim().replace(/^['"]|['"]$/g, "");
  if (trimmed.startsWith("file://")) {
    try {
      return decodeURIComponent(new URL(trimmed).pathname);
    } catch {
      return trimmed.replace(/^file:\/\//, "");
    }
  }
  return trimmed;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readMarkdownFile(filePath: string): Promise<MarkdownFileSource> {
  const resolved = resolve(normalizeMaybeFileUrl(filePath));
  const info = await stat(resolved);
  if (!info.isFile()) {
    throw new Error("Not a file");
  }
  if (!isMarkdownPath(resolved)) {
    throw new Error("Not a Markdown file (.md / .markdown / .mdx)");
  }

  const markdown = await readFile(resolved, "utf8");
  return {
    path: resolved,
    markdown,
    fileName: basename(resolved),
  };
}

/**
 * Resolve a markdown file from:
 * 1) Finder selection
 * 2) Clipboard file payload (copy file in Finder)
 * 3) Clipboard text that looks like an absolute .md path
 */
export async function resolveMarkdownFileSource(): Promise<MarkdownFileSource> {
  // 1) Finder selection
  try {
    const items = await getSelectedFinderItems();
    const mdItem = items.find((item) => isMarkdownPath(item.path));
    if (mdItem) {
      return await readMarkdownFile(mdItem.path);
    }
  } catch {
    // Finder not frontmost, inaccessible, or without a usable selection — fall through.
  }

  // 2) Clipboard file (when user copied a file in Finder)
  const clip = await Clipboard.read();
  if (clip.file) {
    const filePath = normalizeMaybeFileUrl(clip.file);
    if (await pathExists(filePath)) {
      return await readMarkdownFile(filePath);
    }
  }

  // 3) Clipboard text path
  const text = (clip.text ?? "").trim();
  if (text) {
    const candidate = normalizeMaybeFileUrl(text.split("\n")[0] ?? "");
    if (isAbsolute(candidate) && isMarkdownPath(candidate) && (await pathExists(candidate))) {
      return await readMarkdownFile(candidate);
    }
  }

  throw new Error("No Markdown file found. Select a .md in Finder, copy a .md file, or copy its absolute path.");
}
