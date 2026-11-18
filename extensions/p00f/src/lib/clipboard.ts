import {
  MAX_CLIP_BYTES,
  formatBytes,
  guessMimeFromFilename,
  inferCreateKind,
  type CreatedClip,
  type HttpLike,
} from "@p00f/core";
import { basename } from "node:path";
import {
  createContentPoof,
  createTextPoof,
  type RaycastClipboardLike,
} from "./create-service";
import type { CreateDefaults } from "./preferences";

export interface ClipboardReadContent {
  text?: string;
  file?: string | string[];
  html?: string;
}

export interface ClipboardPathStats {
  isFile: boolean;
  isDirectory?: boolean;
}

export interface ClipboardImage {
  bytes: Uint8Array;
  mime: string;
  filename: string;
}

export interface ClipboardDeps {
  http: HttpLike;
  clipboard: RaycastClipboardLike;
  readClipboard(): Promise<ClipboardReadContent>;
  statPath(path: string): Promise<ClipboardPathStats>;
  readFile(path: string): Promise<Uint8Array>;
  // Optional: read raw image bytes from the clipboard (e.g. a screenshot).
  // Raycast's Clipboard.read() only surfaces text/file/html, so callers that
  // want image support pass a platform-specific reader (see poof-clipboard.ts
  // for the macOS osascript-based implementation). Returns null when no image
  // is on the clipboard, so callers can fall through to the empty-clipboard
  // error.
  readClipboardImage?(): Promise<ClipboardImage | null>;
  maxBytes?: number;
}

export async function createClipboardPoof(
  deps: ClipboardDeps,
  defaults: CreateDefaults,
): Promise<CreatedClip> {
  const value = await deps.readClipboard();
  if (value.file !== undefined)
    return await createClipboardFilePoof(deps, defaults, value.file);
  const text = value.text?.trim()
    ? value.text
    : value.html?.trim()
      ? value.html
      : undefined;
  if (text) return createTextPoof(deps, { text, ...defaults });

  // No text or file path on the clipboard: try raw image bytes (screenshots
  // taken with Cmd+Shift+Ctrl+4 land here rather than as a file path).
  const image = await deps.readClipboardImage?.();
  if (image) return await createClipboardImagePoof(deps, defaults, image);

  throw new Error("Clipboard is empty");
}

async function createClipboardImagePoof(
  deps: ClipboardDeps,
  defaults: CreateDefaults,
  image: ClipboardImage,
): Promise<CreatedClip> {
  const maxBytes = deps.maxBytes ?? MAX_CLIP_BYTES;
  if (image.bytes.length > maxBytes)
    throw new Error(`Too big to poof. Max is ${formatBytes(maxBytes)}`);
  return createContentPoof(deps, {
    ...defaults,
    content: image.bytes,
    meta: {
      kind: inferCreateKind({ mime: image.mime, filename: image.filename }),
      filename: image.filename,
      mime: image.mime,
      size: image.bytes.length,
    },
  });
}

async function createClipboardFilePoof(
  deps: ClipboardDeps,
  defaults: CreateDefaults,
  file: string | string[],
): Promise<CreatedClip> {
  if (Array.isArray(file))
    throw new Error("p00f can share one text or file item at a time");
  if (!file.trim()) throw new Error("Clipboard is empty");
  const stats = await deps.statPath(file);
  if (!stats.isFile)
    throw new Error("p00f can share one text or file item at a time");

  const content = await deps.readFile(file);
  const maxBytes = deps.maxBytes ?? MAX_CLIP_BYTES;
  if (content.length > maxBytes)
    throw new Error(`Too big to poof. Max is ${formatBytes(maxBytes)}`);

  const filename = basename(file);
  const mime = guessMimeFromFilename(filename) ?? "application/octet-stream";
  return createContentPoof(deps, {
    ...defaults,
    content,
    meta: {
      kind: inferCreateKind({ mime, filename }),
      filename,
      mime,
      size: content.length,
    },
  });
}
