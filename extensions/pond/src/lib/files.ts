import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { environment } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import type { ApiSave } from "pond-api";
import { useEffect, useState } from "react";
import { pond } from "../api/client";
import { saveTitle } from "./display";
import { downloadThumbnail, thumbnailKey } from "./thumbnails";

const EXTENSIONS = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/gif", "gif"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
  ["image/heic", "heic"],
  ["image/svg+xml", "svg"],
  ["video/mp4", "mp4"],
  ["video/quicktime", "mov"],
  ["video/webm", "webm"],
  ["audio/mpeg", "mp3"],
  ["audio/mp4", "m4a"],
  ["audio/wav", "wav"],
  ["application/pdf", "pdf"],
  ["text/plain", "txt"],
  ["text/html", "html"],
]);

/** Originals can be large, so only the last few stay cached. */
const KEEP = 12;
/** Quick Look downloads on every settled selection, so large originals stay a deliberate Copy File. */
const QUICK_LOOK_LIMIT = 20_000_000;
const PREVIEWABLE = new Set(["video", "audio", "document"]);

export interface LocalFile {
  path: string;
  name: string;
}

function root(): string {
  return join(environment.supportPath, "files");
}

function fileName(save: ApiSave, extension: string): string {
  const base = saveTitle(save)
    .replace(/[/\\:*?"<>|\n\r\t]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  return `${base || "Pond Save"}.${extension}`;
}

async function prune(): Promise<void> {
  const entries = await Promise.all(
    (await readdir(root())).map(async (name) => {
      const path = join(root(), name);
      return { path, modified: (await stat(path).catch(() => null))?.mtimeMs ?? 0 };
    }),
  );
  entries.sort((a, b) => b.modified - a.modified);
  await Promise.all(entries.slice(KEEP).map((entry) => rm(entry.path, { recursive: true, force: true })));
}

export async function downloadFile(save: ApiSave, index = 0): Promise<LocalFile> {
  if (save.media.files === 0) throw new Error("This save has no file. Open it in Pond to see what was captured.");
  const folder = join(root(), `${thumbnailKey(save)}-${index}`);
  const existing = await readdir(folder).catch(() => []);
  if (existing[0]) return { path: join(folder, existing[0]), name: existing[0] };
  const file = await pond().file(save.id, index);
  const name = fileName(save, EXTENSIONS.get(file.type.replace(/;.*$/, "")) ?? "bin");
  await mkdir(folder, { recursive: true });
  const path = join(folder, name);
  await writeFile(path, file.bytes);
  await prune().catch(() => undefined);
  return { path, name };
}

async function quickLookFile(save: ApiSave | undefined): Promise<LocalFile | null> {
  if (!save) return null;
  if (save.kind === "image" && save.thumbnail) {
    const path = await downloadThumbnail(save, "large");
    return path ? { path, name: saveTitle(save) } : null;
  }
  const small = save.media.bytes !== null && save.media.bytes <= QUICK_LOOK_LIMIT;
  if (save.kind && PREVIEWABLE.has(save.kind) && save.media.files > 0 && small) return downloadFile(save);
  return null;
}

/** Fetches a preview for the selected save once the selection settles. */
export function useQuickLook(save: ApiSave | undefined): LocalFile | undefined {
  const [settled, setSettled] = useState<ApiSave>();
  useEffect(() => {
    const timer = setTimeout(() => setSettled(save), 300);
    return () => clearTimeout(timer);
  }, [save]);
  const { data } = usePromise(quickLookFile, [settled], {
    execute: Boolean(settled),
    onError: () => undefined,
  });
  return data && settled?.id === save?.id ? data : undefined;
}
