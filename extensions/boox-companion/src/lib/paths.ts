import path from "node:path";
import { INTERNAL_STORAGE_ROOT } from "../models/boox";

const INVALID_FILENAME_CHARACTERS = /[\\/:*?"<>|]/;

export function normalizeRemotePath(input: string): string {
  const trimmed = input.trim().replace(/\\/g, "/");
  if (!trimmed || trimmed === "/") return INTERNAL_STORAGE_ROOT;

  const absolute = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const normalized = path.posix.normalize(absolute);
  if (normalized === INTERNAL_STORAGE_ROOT || normalized.startsWith(`${INTERNAL_STORAGE_ROOT}/`)) return normalized;
  return `${INTERNAL_STORAGE_ROOT}${normalized}`;
}

export function displayRemotePath(input: string): string {
  const normalized = normalizeRemotePath(input);
  const relative = normalized.slice(INTERNAL_STORAGE_ROOT.length);
  return relative || "/";
}

export function parentRemotePath(input: string): string | undefined {
  const normalized = normalizeRemotePath(input);
  if (normalized === INTERNAL_STORAGE_ROOT) return undefined;
  const parent = path.posix.dirname(normalized);
  return parent.startsWith(INTERNAL_STORAGE_ROOT) ? parent : INTERNAL_STORAGE_ROOT;
}

export function validateUploadName(name: string): string | undefined {
  if (!name || name.startsWith(".")) return "File names cannot start with a period";
  if (INVALID_FILENAME_CHARACTERS.test(name)) return "File name contains a character unsupported by BOOX";
  if (Buffer.byteLength(name, "utf8") >= 254) return "File name is longer than 253 UTF-8 bytes";
  return undefined;
}

export function resolveDownloadPath(directory: string, remoteName: string): string {
  const root = path.resolve(directory);
  const safeName = Array.from(remoteName, (character) =>
    character.charCodeAt(0) < 32 || INVALID_FILENAME_CHARACTERS.test(character) ? "-" : character
  )
    .join("")
    .trim();
  if (!safeName || safeName === "." || safeName === "..") throw new Error("BOOX returned an invalid file name");

  const destination = path.resolve(root, safeName);
  if (path.dirname(destination) !== root) throw new Error("BOOX returned a file name outside the download directory");
  return destination;
}

export function isLibraryDocument(name: string): boolean {
  const extension = path.extname(name).slice(1).toLowerCase();
  return new Set([
    "azw",
    "azw3",
    "caj",
    "cbr",
    "cbz",
    "chm",
    "djvu",
    "doc",
    "docm",
    "docx",
    "epub",
    "fb2",
    "fbz",
    "htm",
    "html",
    "jeb",
    "jdnovel",
    "mobi",
    "odt",
    "pdb",
    "pdf",
    "ppt",
    "pptx",
    "prc",
    "rtf",
    "sxw",
    "trc",
    "txt",
    "xls",
    "xlss",
    "xhtml",
    "xml",
  ]).has(extension);
}
