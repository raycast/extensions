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

export interface ClipboardDeps {
  http: HttpLike;
  clipboard: RaycastClipboardLike;
  readClipboard(): Promise<ClipboardReadContent>;
  statPath(path: string): Promise<ClipboardPathStats>;
  readFile(path: string): Promise<Uint8Array>;
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
  if (!text) throw new Error("Clipboard is empty");
  return createTextPoof(deps, { text, ...defaults });
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
