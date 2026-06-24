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

export interface SelectedFinderItem {
  path: string;
}

export interface SelectionPathStats {
  isFile: boolean;
  isDirectory?: boolean;
}

export interface SelectionDeps {
  http: HttpLike;
  clipboard: RaycastClipboardLike;
  getSelectedText(): Promise<string>;
  getSelectedFinderItems?(): Promise<SelectedFinderItem[]>;
  statPath?(path: string): Promise<SelectionPathStats>;
  readFile?(path: string): Promise<Uint8Array>;
  maxBytes?: number;
}

export async function createSelectedPoof(
  deps: SelectionDeps,
  defaults: CreateDefaults,
): Promise<CreatedClip> {
  const finderItems = await deps.getSelectedFinderItems?.().catch(() => []);
  if (finderItems?.length)
    return await createSelectedFinderItemPoof(deps, defaults, finderItems);

  let selectedText: string;
  try {
    selectedText = await deps.getSelectedText();
  } catch {
    throw new Error("No selected text to poof");
  }
  if (!selectedText.trim()) throw new Error("No selected text to poof");
  return createTextPoof(deps, { text: selectedText, ...defaults });
}

export const createSelectedTextPoof = createSelectedPoof;

async function createSelectedFinderItemPoof(
  deps: SelectionDeps,
  defaults: CreateDefaults,
  items: SelectedFinderItem[],
): Promise<CreatedClip> {
  if (items.length !== 1)
    throw new Error("p00f can share one selected text or file item at a time");
  if (!deps.statPath || !deps.readFile)
    throw new Error("Could not read selected Finder item");

  const path = items[0].path;
  const stats = await deps.statPath(path);
  if (!stats.isFile)
    throw new Error("p00f can share one selected text or file item at a time");

  const content = await deps.readFile(path);
  const maxBytes = deps.maxBytes ?? MAX_CLIP_BYTES;
  if (content.length > maxBytes)
    throw new Error(`Too big to poof. Max is ${formatBytes(maxBytes)}`);

  const filename = basename(path);
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
