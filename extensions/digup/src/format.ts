import { Color, Icon, Image } from "@raycast/api";
import { homedir } from "os";
import { extname } from "path";
import type { Hit, Kind } from "./service";

export const kinds: Record<Kind, { title: string; plural: string; icon: Image.ImageLike; color: Color }> = {
  doc: {
    title: "Document",
    plural: "Documents",
    icon: Icon.Text,
    color: Color.Blue,
  },
  pdf: { title: "PDF", plural: "PDFs", icon: Icon.Document, color: Color.Red },
  image: {
    title: "Image",
    plural: "Images",
    icon: Icon.Image,
    color: Color.Green,
  },
  screenshot: {
    title: "Screenshot",
    plural: "Screenshots",
    icon: Icon.Desktop,
    color: Color.Purple,
  },
  video: {
    title: "Video",
    plural: "Videos",
    icon: Icon.Video,
    color: Color.Orange,
  },
  audio: {
    title: "Audio",
    plural: "Audio",
    icon: Icon.Music,
    color: Color.Magenta,
  },
  code: { title: "Code", plural: "Code", icon: Icon.Code, color: Color.Yellow },
};

export const tilde = (path: string) => (path.startsWith(homedir()) ? "~" + path.slice(homedir().length) : path);

export function clock(seconds: number): string {
  const total = Math.floor(seconds);
  const pad = (n: number) => String(n).padStart(2, "0");
  return total >= 3600
    ? `${Math.floor(total / 3600)}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`
    : `${Math.floor(total / 60)}:${pad(total % 60)}`;
}

export function bytes(size: number): string {
  if (size < 1000) return `${size} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = size / 1000;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit++;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

/** Where in the file it matched, short: "p. 3", "1:24", "L12–40". */
export function place(hit: Hit): string | undefined {
  if (hit.loc == null) return undefined;
  switch (hit.segment) {
    case "page":
    case "page_image":
      return `p. ${hit.loc}`;
    case "frame":
      return clock(hit.loc);
    case "audio":
      return hit.kind === "video" ? `♪ ${clock(hit.loc)}` : clock(hit.loc);
    case "lines": {
      const end = hit.loc_end ?? hit.loc;
      return end === hit.loc ? `L${hit.loc}` : `L${hit.loc}–${end}`;
    }
    default:
      return undefined;
  }
}

/** Why it's here, as DigUp's own panel says it. */
export function reason(hit: Hit): string {
  const meaning = (hit.z ?? 0) >= 2;
  if (!meaning) return hit.keyword_rank != null ? "Has your words" : "Matches its name";
  const at = hit.loc != null ? clock(hit.loc) : "";
  const page = hit.loc != null ? `page ${hit.loc}` : "a page";
  switch (hit.segment) {
    case "image":
      return hit.kind === "screenshot" ? "Matches what's on screen" : "Matches the picture";
    case "ocr":
      return "Matches the text in it";
    case "frame":
      return `Matches the frame at ${at}`;
    case "audio":
      return hit.kind === "video" ? `Matches the sound at ${at}` : `Matches what's heard at ${at}`;
    case "page":
      return `Matches the text on ${page}`;
    case "page_image":
      return `Matches ${page}`;
    case "name":
      return "Matches its name";
    case "lines":
    case "cells":
      return "Matches the code";
    default:
      return "Matches its text";
  }
}

/** The facts line under the preview: pages, size on screen, length. */
export function facts(hit: Hit): { title: string; text: string }[] {
  const out: { title: string; text: string }[] = [];
  const { info } = hit;
  if (info.pages) {
    const pages = Number(info.pages);
    out.push({
      title: "Pages",
      text: `${pages}${info.read_to ? ` (${info.read_to} read so far)` : ""}`,
    });
  }
  if (info.width && info.height) out.push({ title: "Dimensions", text: `${info.width} × ${info.height}` });
  if (info.duration) out.push({ title: "Length", text: clock(Number(info.duration)) });
  if (info.lines) out.push({ title: "Lines", text: Number(info.lines).toLocaleString() });
  return out;
}

const markdownSpecials = /([\\`*_{}[\]()#+\-!|>~])/g;

/** DigUp marks matched words «like this»; show them bold, everything else literal. */
export function excerptMarkdown(excerpt: string): string {
  return excerpt
    .replace(markdownSpecials, "\\$1")
    .replace(/«([^»]*)»/g, "**$1**")
    .replace(/\s+/g, " ")
    .trim();
}

export function foundWords(excerpt?: string): string[] {
  if (!excerpt) return [];
  const words = new Set<string>();
  for (const match of excerpt.matchAll(/«([^»]*)»/g)) if (match[1].trim().length >= 3) words.add(match[1].trim());
  return [...words];
}

const fenceLanguages: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "tsx",
  ".js": "javascript",
  ".py": "python",
  ".swift": "swift",
  ".rs": "rust",
  ".go": "go",
  ".sh": "bash",
  ".json": "json",
  ".sql": "sql",
  ".rb": "ruby",
  ".java": "java",
  ".kt": "kotlin",
  ".c": "c",
  ".cpp": "cpp",
  ".css": "css",
  ".html": "html",
  ".yml": "yaml",
  ".yaml": "yaml",
};

export const fenceLanguage = (path: string) => fenceLanguages[extname(path).toLowerCase()] ?? "";

/** A local image for Raycast's markdown, sized to the detail pane. */
export const imageMarkdown = (path: string, height = 330) =>
  `![](${encodeURI("file://" + path).replace(/[()]/g, (c) => "%" + c.charCodeAt(0).toString(16))}${
    height ? `?raycast-height=${height}` : ""
  })`;

/** A passage (or a whole text file) as markdown, with the words that matched in bold. */
export function passageMarkdown(hit: Hit, text: string, max = 2400): string {
  const passage = text.trim().slice(0, max);
  if (!passage) return "";
  const more = text.trim().length > max ? "\n\n…" : "";
  if (hit.kind === "code") return "```" + fenceLanguage(hit.path) + "\n" + passage + "\n```" + more;
  // Documents are mostly markdown or plain text, so render them and highlight the words that matched.
  let out = passage;
  for (const word of foundWords(hit.excerpt)) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`(?<![\\w*])(${escaped})(?![\\w*])`, "gi"), "**$1**");
  }
  return out + more;
}
