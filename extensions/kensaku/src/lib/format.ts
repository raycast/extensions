import os from "node:os";
import path from "node:path";
import { Color, Keyboard } from "@raycast/api";
import type { MatchType, SearchResultItem, SnippetResponse } from "./types";

const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  bash: "bash",
  c: "c",
  cc: "cpp",
  cjs: "javascript",
  cpp: "cpp",
  cs: "csharp",
  css: "css",
  go: "go",
  h: "c",
  hpp: "cpp",
  html: "html",
  java: "java",
  js: "javascript",
  json: "json",
  jsx: "jsx",
  kt: "kotlin",
  md: "markdown",
  mdx: "markdown",
  mjs: "javascript",
  php: "php",
  ps1: "powershell",
  psm1: "powershell",
  py: "python",
  pyi: "python",
  rb: "ruby",
  rs: "rust",
  scss: "scss",
  sh: "bash",
  sql: "sql",
  swift: "swift",
  toml: "toml",
  ts: "typescript",
  tsx: "tsx",
  txt: "text",
  xml: "xml",
  yaml: "yaml",
  yml: "yaml",
  zsh: "bash",
};

const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".bmp",
  ".tif",
  ".tiff",
  ".svg",
  ".avif",
  ".heic",
]);

/** Creates a cross-platform Raycast shortcut using Cmd on macOS and Ctrl on Windows. */
export function modShortcut(extraModifiers: ("shift" | "alt")[], key: Keyboard.KeyEquivalent): Keyboard.Shortcut {
  const macModifiers: Keyboard.KeyModifier[] = [
    "cmd",
    ...extraModifiers.map((mod): Keyboard.KeyModifier => (mod === "alt" ? "opt" : mod)),
  ];
  const winModifiers: Keyboard.KeyModifier[] = ["ctrl", ...extraModifiers];

  return {
    macOS: { modifiers: macModifiers, key },
    Windows: { modifiers: winModifiers, key },
  };
}

/** Formats a byte count into a human-readable string. */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes < 0) {
    return "Unknown";
  }
  if (bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const formatted = unitIndex === 0 ? `${Math.round(value)}` : value >= 10 ? value.toFixed(1) : value.toFixed(2);
  return `${formatted} ${units[unitIndex]}`;
}

/** Formats a Unix timestamp (seconds) into a relative label with date. */
export function formatUnixTime(epochSeconds: number | null | undefined): string {
  if (!epochSeconds || !Number.isFinite(epochSeconds) || epochSeconds <= 0) {
    return "Unknown";
  }

  const date = new Date(epochSeconds * 1000);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  let relative = "";
  if (diffSec >= 0) {
    if (diffSec < 60) {
      relative = "just now";
    } else if (diffSec < 3600) {
      relative = `${Math.floor(diffSec / 60)}m ago`;
    } else if (diffSec < 86400) {
      relative = `${Math.floor(diffSec / 3600)}h ago`;
    } else if (diffSec < 86400 * 30) {
      relative = `${Math.floor(diffSec / 86400)}d ago`;
    }
  }

  const dateStr = date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return relative ? `${relative} · ${dateStr}` : dateStr;
}

/** Replaces the current user's home directory prefix with `~` for compact display. */
export function formatShortPath(fullPath: string): string {
  const home = os.homedir();
  if (!home) {
    return fullPath;
  }

  const normalizedHome = path.resolve(home);
  const normalizedTarget = path.resolve(fullPath);

  if (process.platform === "win32") {
    if (normalizedTarget.toLowerCase() === normalizedHome.toLowerCase()) {
      return "~";
    }
    if (normalizedTarget.toLowerCase().startsWith(`${normalizedHome.toLowerCase()}${path.sep}`)) {
      return `~${normalizedTarget.slice(normalizedHome.length)}`;
    }
  } else {
    if (normalizedTarget === normalizedHome) {
      return "~";
    }
    if (normalizedTarget.startsWith(`${normalizedHome}${path.sep}`)) {
      return `~${normalizedTarget.slice(normalizedHome.length)}`;
    }
  }

  return fullPath;
}

/** Returns the Markdown fence language identifier for a file path. */
export function getCodeFenceLanguage(filePath: string): string {
  const base = path.basename(filePath).toLowerCase();
  if (base === "dockerfile") {
    return "dockerfile";
  }
  if (base === "makefile") {
    return "makefile";
  }
  const ext = path.extname(base).replace(/^\./, "");
  return EXTENSION_TO_LANGUAGE[ext] ?? "";
}

/** Returns true when a path ends in a common image extension. */
export function isImageFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

/** Returns a concise human-readable label for a Kensaku match type. */
export function getMatchTypeLabel(matchType: MatchType): string {
  switch (matchType) {
    case "FileName":
      return "Filename";
    case "Content":
    case "ContentFolded":
      return "Content";
    case "Semantic":
      return "Semantic";
    case "Both":
      return "Name + Content";
    default:
      return matchType ? String(matchType) : "Match";
  }
}

/** Maps a Kensaku match type to a Raycast accessory tag color. */
export function getMatchTypeColor(matchType: MatchType): Color {
  switch (matchType) {
    case "FileName":
      return Color.Blue;
    case "Content":
    case "ContentFolded":
      return Color.Green;
    case "Semantic":
      return Color.Purple;
    case "Both":
      return Color.Orange;
    default:
      return Color.SecondaryText;
  }
}

/** Wraps content in a fenced Markdown block safe against inner backtick runs. */
export function buildSafeCodeBlock(content: string, language = ""): string {
  const matches = content.match(/`+/g);
  const longestRun = matches ? Math.max(...matches.map((m) => m.length)) : 0;
  const fence = "`".repeat(Math.max(3, longestRun + 1));
  return `${fence}${language}\n${content}\n${fence}`;
}

/** Escapes special Markdown inline code ticks in a file path or identifier. */
export function inlineCode(text: string): string {
  const matches = text.match(/`+/g);
  const longestRun = matches ? Math.max(...matches.map((m) => m.length)) : 0;
  const ticks = "`".repeat(longestRun + 1);
  const needsPadding = text.startsWith("`") || text.endsWith("`");
  return needsPadding ? `${ticks} ${text} ${ticks}` : `${ticks}${text}${ticks}`;
}

/** Builds the Markdown preview content for a file search result. */
export function buildSnippetMarkdown(
  item: SearchResultItem,
  snippet?: SnippetResponse | null,
  snippetError?: string | null,
): string {
  const filename = path.basename(item.path) || item.path;
  const shortPath = formatShortPath(item.path);
  const lang = getCodeFenceLanguage(item.path);
  const lines: string[] = [`### ${filename}`, "", inlineCode(shortPath), ""];

  const snippetText = snippet?.text?.trimEnd();
  if (snippetText) {
    const rangeLabel = `Lines ${snippet!.line_start}–${snippet!.line_end}${snippet!.truncated ? " (truncated)" : ""}`;
    lines.push(`**${rangeLabel}**`, "", buildSafeCodeBlock(snippetText, lang));
    return lines.join("\n");
  }

  const inlineExcerpt = item.snippet?.trim();
  if (inlineExcerpt) {
    const excerptLabel = `Matched Excerpt${item.snippet_truncated ? " (truncated)" : ""}`;
    lines.push(`**${excerptLabel}**`, "", buildSafeCodeBlock(inlineExcerpt, lang));
    return lines.join("\n");
  }

  if (snippetError) {
    lines.push(`_${snippetError}_`);
  } else if (isImageFile(item.path)) {
    lines.push("_Image matched by filename or metadata. Press Enter to open._");
  } else {
    lines.push("_No text preview available for this match. Press Enter to open._");
  }

  return lines.join("\n");
}
