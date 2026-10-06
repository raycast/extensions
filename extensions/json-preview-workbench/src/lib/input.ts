import { readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { basename } from "node:path";
import { MAX_INPUT_BYTES, parseInput } from "./json";

export async function readInput(input: string): Promise<{ text: string; label: string }> {
  const trimmed = input.trim();
  if (trimmed.startsWith("/*") || trimmed.startsWith("//")) return { text: input, label: "Text" };
  const fileUrl = trimmed.startsWith("file://");
  const decoded = fileUrl ? fileURLToPath(trimmed) : trimmed;
  const path = decoded.startsWith("~/") ? `${homedir()}/${decoded.slice(2)}` : decoded;
  if (!path.startsWith("/") || (!fileUrl && path.includes("\n"))) return { text: input, label: "Text" };
  const info = await stat(path).catch(() => null);
  if (!info) throw new Error("The file does not exist. Check the path or paste JSON directly.");
  if (!info.isFile()) throw new Error("Choose a file instead of a directory.");
  if (info.size > MAX_INPUT_BYTES) throw new Error("The file exceeds 8 MiB. Split it before previewing.");
  const buffer = await readFile(path);
  if (buffer.length > MAX_INPUT_BYTES) throw new Error("The file exceeds 8 MiB. Split it before previewing.");
  return { text: buffer.toString("utf8"), label: path.split("/").at(-1) ?? "File" };
}

export async function readClipboardInput(file?: string, text = ""): Promise<string> {
  if (!file) return text;
  try {
    return (await readInput(file)).text;
  } catch (error) {
    let filename = basename(file);
    try {
      if (file.startsWith("file://")) filename = basename(fileURLToPath(file));
    } catch {
      // A malformed file URL can still accompany a separate clipboard document.
    }
    const trimmed = text.trim();
    if (!trimmed || trimmed === file || trimmed === filename) throw error;
    try {
      parseInput(text);
    } catch {
      throw error;
    }
    return text;
  }
}
