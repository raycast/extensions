/** What the user is about to send, resolved up front so every screen can say exactly what it is. */
import { statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, sep } from "node:path";

export type SendContent = (
  | { kind: "files"; paths: string[] }
  /** `concealed`: copied from a password manager, so never shown on screen or used as a file name. */
  | { kind: "text"; text: string; concealed?: boolean }
  | { kind: "image"; path: string }
) & {
  /** Where the content came from, e.g. "Clipboard" or "Selected in Finder". */
  source: string;
};

function quote(value: string, max = 40) {
  const oneLine = value
    .slice(0, max * 8)
    .replace(/\s+/g, " ")
    .trim();
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
  return path === home || path.startsWith(home + sep) ? `~${path.slice(home.length)}` : path;
}

/** Short name used in titles and buttons: “bu”, 3 Items, “Hello there…”, Clipboard Image. */
export function contentTitle(content: SendContent) {
  switch (content.kind) {
    case "files":
      return content.paths.length === 1 ? quote(basename(content.paths[0])) : `${content.paths.length} Items`;
    case "text":
      return content.concealed ? "Hidden Text" : quote(content.text);
    case "image":
      return "Clipboard Image";
  }
}

/** A short screen title that doesn't depend on file names or text: Send Text, Send File, Send 3 Items. */
export function contentScreenTitle(content: SendContent) {
  switch (content.kind) {
    case "files":
      return content.paths.length === 1
        ? isFolder(content.paths[0])
          ? "Send Folder"
          : "Send File"
        : `Send ${content.paths.length} Items`;
    case "text":
      return "Send Text";
    case "image":
      return "Send Image";
  }
}

/** Name for a list row, where quotes would be noise: bu, 3 Items, “Hello there…”, Clipboard Image. */
export function contentListTitle(content: SendContent) {
  return content.kind === "files" && content.paths.length === 1 ? basename(content.paths[0]) : contentTitle(content);
}

/** What kind of thing it is: Folder, File, 3 Files, Text, PNG Image. */
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
      if (content.concealed) return "Text · Hidden (from a password manager)";
      return content.text.length > 1 ? `Text · ${content.text.length.toLocaleString("en-US")} characters` : "Text";
    case "image":
      return "PNG Image";
  }
}

export function contentLocation(content: SendContent) {
  if (content.kind !== "files") return undefined;
  const parents = new Set(content.paths.map((path) => dirname(path)));
  return parents.size === 1 ? tildify([...parents][0]) : undefined;
}
