/** What the user is about to send, resolved up front so every screen can say exactly what it is. */
import { statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname } from "node:path";
import { newTransferId } from "./actions";
import { readClipboard } from "./clipboard";
import { outboxDir } from "./outbox";

export type SendContent = (
  { kind: "files"; paths: string[] } | { kind: "text"; text: string } | { kind: "image"; path: string }
) & {
  /** Where the content came from, e.g. "Clipboard" or "Selected in Finder". */
  source: string;
  /** Pre-allocated when the content already lives in this transfer's outbox (clipboard images). */
  transferId?: string;
};

function quote(value: string, max = 40) {
  const oneLine = value.replace(/\s+/g, " ").trim();
  return `“${oneLine.length > max ? `${oneLine.slice(0, max - 1)}…` : oneLine}”`;
}

function isFolder(path: string) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

export function tildify(path: string) {
  const home = homedir();
  return path.startsWith(home) ? `~${path.slice(home.length)}` : path;
}

/** Short name used in titles and buttons: “bu”, 3 Items, “Hello there…”, Image. */
export function contentTitle(content: SendContent) {
  switch (content.kind) {
    case "files":
      return content.paths.length === 1 ? quote(basename(content.paths[0])) : `${content.paths.length} Items`;
    case "text":
      return quote(content.text);
    case "image":
      return "Image";
  }
}

/** What kind of thing it is: Folder, File, 3 Files, Text, Image. */
export function contentKind(content: SendContent) {
  switch (content.kind) {
    case "files": {
      const folders = content.paths.filter(isFolder).length;
      const files = content.paths.length - folders;
      const count = (n: number, word: string) => (n ? [`${n} ${word}${n === 1 ? "" : "s"}`] : []);
      if (content.paths.length === 1) return folders ? "Folder" : "File";
      return [...count(files, "File"), ...count(folders, "Folder")].join(", ");
    }
    case "text":
      return content.text.length > 1 ? `Text · ${content.text.length.toLocaleString()} characters` : "Text";
    case "image":
      return "Image";
  }
}

export function contentLocation(content: SendContent) {
  if (content.kind !== "files") return undefined;
  const parents = new Set(content.paths.map((path) => dirname(path)));
  return parents.size === 1 ? tildify([...parents][0]) : undefined;
}

/** Reads the clipboard now so the user can see it before choosing a recipient. */
export async function readClipboardContent(supportPath: string): Promise<SendContent | undefined> {
  const transferId = newTransferId();
  const clip = await readClipboard(outboxDir(supportPath, transferId));
  const source = "Clipboard";
  switch (clip.kind) {
    case "files":
      return clip.paths.length ? { kind: "files", paths: clip.paths, source } : undefined;
    case "text":
      return { kind: "text", text: clip.text, source };
    case "image":
      return { kind: "image", path: clip.path, source, transferId };
    case "empty":
      return undefined;
  }
}
