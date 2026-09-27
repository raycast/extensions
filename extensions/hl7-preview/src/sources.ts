import { Clipboard, getSelectedFinderItems } from "@raycast/api";
import { readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeBuffer, looksLikeHL7 } from "./hl7";

export interface Source {
  name: string;
  path?: string;
  text: string;
}

const MAX_FILE_BYTES = 20 * 1024 * 1024;

export async function readSource(path: string): Promise<Source | undefined> {
  const info = await stat(path);
  if (!info.isFile() || info.size > MAX_FILE_BYTES) return undefined;
  const text = decodeBuffer(await readFile(path));
  return looksLikeHL7(text) ? { name: basename(path), path, text } : undefined;
}

export async function readFinderSelection(): Promise<Source[]> {
  try {
    const items = await getSelectedFinderItems();
    const sources = await Promise.all(items.map((item) => readSource(item.path).catch(() => undefined)));
    return sources.filter((s): s is Source => s !== undefined);
  } catch {
    // Finder was not the frontmost app when the command opened.
    return [];
  }
}

/** A clipboard file entry is a file:// URL; a pasted path may start with ~. */
function toPath(value: string): string {
  const trimmed = value.trim().replace(/^["']|["']$/g, "");
  if (trimmed.startsWith("file://")) {
    try {
      return fileURLToPath(trimmed);
    } catch {
      return trimmed;
    }
  }
  return trimmed.startsWith("~/") ? join(homedir(), trimmed.slice(2)) : trimmed;
}

/** The clipboard as a source: a copied file, a copied message, or a copied path. */
export async function readClipboard(): Promise<Source | undefined> {
  const { text, file } = await Clipboard.read();
  if (file) return readSource(toPath(file)).catch(() => undefined);
  if (!text) return undefined;
  if (looksLikeHL7(text)) return { name: "Pasted message", text };
  const path = toPath(text);
  return path.startsWith("/") ? readSource(path).catch(() => undefined) : undefined;
}
