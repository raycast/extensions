import { Dirent } from "fs";
import { readdir } from "fs/promises";
import { join } from "path";
import { EMOJI } from "$lib/constants";
import type { FolderTreeOptions } from "./types";

const DEFAULTS = {
  maxDepth: 2,
  maxNodes: 200,
  skipDotfiles: true,
  maxLineChars: 70,
} as const;

export type FolderTreePreviewResult = {
  markdown: string | undefined;
  files: number;
  dirs: number;
  truncated: number;
};

export async function generateFolderTree(root: string, opts?: FolderTreeOptions): Promise<FolderTreePreviewResult> {
  const options = { ...DEFAULTS, ...(opts ?? {}) } as FolderTreeOptions & typeof DEFAULTS;

  let nodes = 0;
  let truncated = 0;
  let files = 0;
  let dirs = 0;

  const lines: string[] = [];

  async function listChildren(path: string, depth: number, prefix: string) {
    if (depth > options.maxDepth) return;
    let entries: Dirent[] = [];
    try {
      entries = await readdir(path, { withFileTypes: true });
    } catch {
      return;
    }

    // Skip dotfiles if enabled
    if (options.skipDotfiles) {
      entries = entries.filter((e) => !e.name.startsWith("."));
    }

    // Sort: directories first, then files; name ascending
    entries.sort((a, b) => {
      const aDir = a.isDirectory();
      const bDir = b.isDirectory();
      if (aDir !== bDir) return aDir ? -1 : 1;
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });

    const lastIndex = entries.length - 1;
    for (let i = 0; i < entries.length; i++) {
      if (nodes >= options.maxNodes) {
        truncated += entries.length - i;
        break;
      }
      const ent = entries[i];
      const isLast = i === lastIndex;
      const branch = isLast ? "└── " : "├── ";
      const nextPrefix = prefix + (isLast ? "    " : "│   ");
      const icon = ent.isDirectory() ? EMOJI.folder : EMOJI.file;

      nodes += 1;
      if (ent.isDirectory()) dirs += 1;
      else files += 1;

      const leader = `${prefix}${branch}${icon} `;
      const budget = Math.max(10, options.maxLineChars - leader.length);
      const display = truncateName(ent.name, budget);
      lines.push(leader + display);

      // Recurse into subdirectories
      if (ent.isDirectory()) {
        await listChildren(join(path, ent.name), depth + 1, nextPrefix);
        if (nodes >= options.maxNodes) {
          // If truncated inside recursion, indicate remaining at this level handled by parent loop
          continue;
        }
      }
    }
  }

  await listChildren(root, 1, "");

  const statsSummary = `${EMOJI.folder} ${dirs} • ${EMOJI.file} ${files}`;
  const moreSummary = truncated > 0 ? ` • … ${truncated} more` : "";
  const headerContent = `[${statsSummary}${moreSummary}]`;

  if (lines.length === 0) {
    return { markdown: ["```text", headerContent, "```"].join("\n"), files, dirs, truncated };
  }

  lines.unshift(headerContent);
  const tree = ["```text", ...lines, "```"].join("\n");
  return { markdown: tree, files, dirs, truncated };
}

const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

function splitGraphemes(value: string): string[] {
  if (segmenter) {
    return Array.from(segmenter.segment(value), (segment) => segment.segment);
  }
  return Array.from(value);
}

function truncateName(name: string, maxChars: number): string {
  const normalized = name.normalize("NFC");
  const totalSegments = splitGraphemes(normalized);
  if (totalSegments.length <= maxChars) {
    return normalized;
  }

  const lastDot = normalized.lastIndexOf(".");
  const hasExt = lastDot > 0 && lastDot < normalized.length - 1;
  const ext = hasExt ? normalized.slice(lastDot) : "";
  const base = hasExt ? normalized.slice(0, lastDot) : normalized;

  const baseSegments = splitGraphemes(base);
  const extSegments = hasExt ? splitGraphemes(ext) : [];

  const ellipsisLen = 1;
  let budget = maxChars - ellipsisLen - extSegments.length;
  budget = Math.max(2, budget);

  if (budget >= baseSegments.length) {
    return normalized;
  }

  let head = Math.max(1, Math.floor(budget * 0.6));
  head = Math.min(head, baseSegments.length - 1);
  let tail = Math.max(1, budget - head);
  tail = Math.min(tail, baseSegments.length - head);

  if (head + tail > baseSegments.length) {
    head = Math.max(1, baseSegments.length - 1);
    tail = 1;
  }

  const headStr = baseSegments.slice(0, head).join("");
  const tailStr = baseSegments.slice(baseSegments.length - tail).join("");

  return hasExt ? `${headStr}…${tailStr}${ext}` : `${headStr}…${tailStr}`;
}
