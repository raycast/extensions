import { environment, Image } from "@raycast/api";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { useEffect, useRef, useState } from "react";
import { getObjectThumbnail, getUploadThumbnail, isThumbnailsUnsupported } from "../api/client";
import type { BucketObject } from "../api/types";
import { thumbnail as legacyThumbnail } from "./format";

/**
 * Thumbnails come from Aktar (Aktar for Mac 0.13 and Aktar for Windows 0.6
 * or later), which makes them for photos, videos, PDFs and documents, also
 * in private buckets. They're kept as PNG files in the extension's support
 * folder, since Raycast shows images from files. Older Aktar versions fall
 * back to the image itself from its public link.
 */
export type ThumbnailSource =
  { kind: "upload"; id: string } | { kind: "object"; destinationId: string; object: BucketObject };

/** Pixels for list icons and for the detail pane. */
export const ICON_PX = 128;
export const DETAIL_PX = 512;
/** List icons are asked for the first this many rows, and for the selected row wherever it is. */
export const MAX_ICONS = 150;

const folder = path.join(environment.supportPath, "thumbnails");
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
/** A file Aktar had no thumbnail for is asked about again after this long. */
const RETRY_AFTER_MS = 24 * 60 * 60 * 1000;
const MAX_RUNNING = 4;

let unsupported = false;
let pruned = false;
let running = 0;
const waiting: (() => void)[] = [];
/** Requests still running, by cache file, so the same thumbnail is never asked for twice at once. */
const inFlight = new Map<string, Promise<string | null>>();

function identity(source: ThumbnailSource) {
  return source.kind === "upload"
    ? `upload\n${source.id}`
    : ["object", source.destinationId, source.object.key, source.object.size, source.object.lastModified ?? ""].join(
        "\n",
      );
}

function cacheFile(source: ThumbnailSource, px: number) {
  const hash = createHash("sha256").update(identity(source)).digest("hex");
  return path.join(folder, `${hash}-${px}`);
}

function prune() {
  if (pruned) return;
  pruned = true;
  try {
    const now = Date.now();
    for (const name of readdirSync(folder)) {
      const file = path.join(folder, name);
      if (now - statSync(file).mtimeMs > MAX_AGE_MS) unlinkSync(file);
    }
  } catch {
    // Nothing cached yet.
  }
}

async function limited<T>(work: () => Promise<T>): Promise<T> {
  if (running >= MAX_RUNNING) await new Promise<void>((resolve) => waiting.push(resolve));
  running += 1;
  try {
    return await work();
  } finally {
    running -= 1;
    waiting.shift()?.();
  }
}

/**
 * The thumbnail's file, or null when there's none. `generate` lets Aktar
 * make one it doesn't have yet, which can mean downloading the file, so
 * it's only used for the selected row.
 */
export function thumbnailFile(source: ThumbnailSource, px: number, generate: boolean): Promise<string | null> {
  const request = `${cacheFile(source, px)}\u0000${generate}`;
  const running = inFlight.get(request);
  if (running) return running;
  const promise = fetchThumbnailFile(source, px, generate).finally(() => inFlight.delete(request));
  inFlight.set(request, promise);
  return promise;
}

async function fetchThumbnailFile(source: ThumbnailSource, px: number, generate: boolean): Promise<string | null> {
  if (unsupported) return null;
  prune();
  const file = cacheFile(source, px);
  const png = `${file}.png`;
  if (existsSync(png)) return png;
  const none = `${file}.none`;
  if (existsSync(none) && Date.now() - statSync(none).mtimeMs < RETRY_AFTER_MS) return null;
  try {
    const data = await limited(() =>
      source.kind === "upload"
        ? getUploadThumbnail(source.id, { px, generate })
        : getObjectThumbnail(source.destinationId, source.object, { px, generate }),
    );
    mkdirSync(folder, { recursive: true });
    if (data) {
      writeFileSync(png, data);
      return png;
    }
    // Without `generate` Aktar may just not have made it yet.
    if (generate) writeFileSync(none, "");
    return null;
  } catch (error) {
    if (isThumbnailsUnsupported(error)) unsupported = true;
    return null;
  }
}

/** Whether Aktar answered that it can't make thumbnails (an older version). */
export function thumbnailsUnsupported() {
  return unsupported;
}

/**
 * List icons for the first `MAX_ICONS` items, filled in as they arrive. Only
 * thumbnails Aktar already has: nothing is downloaded for a list. Kept by
 * the file's identity (key, size and date), not its ID, so a file replaced
 * under the same key gets its new thumbnail after a refresh.
 */
export function useThumbnailIcons(items: { id: string; source: ThumbnailSource }[], selectedId?: string | null) {
  const [files, setFiles] = useState<Record<string, string | null>>({});
  // Asked for already (answered or still running), so a new selection doesn't ask again.
  const requested = useRef(new Set<string>());
  // Selected rows already asked to have one made.
  const generated = useRef(new Set<string>());
  const mounted = useRef(true);
  // Set again on mount: React runs effects twice in development, and a
  // cleanup that left this false would drop every icon that arrives.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const first = items.slice(0, MAX_ICONS);
  // A row further down, or one found by searching, still gets its icon once it's selected.
  const selected = items.find((item) => item.id === selectedId);
  const rows = selected && !first.includes(selected) ? [...first, selected] : first;
  const wanted = rows.map((item) => ({ ...item, identity: identity(item.source) }));
  const key = wanted.map((item) => item.identity).join("\u0000");
  useEffect(() => {
    for (const item of wanted) {
      if (requested.current.has(item.identity)) continue;
      requested.current.add(item.identity);
      thumbnailFile(item.source, ICON_PX, false).then((file) => {
        if (mounted.current) setFiles((current) => ({ ...current, [item.identity]: current[item.identity] || file }));
      });
    }
  }, [key]);
  // The selected row may have one made, like the detail pane does: an image
  // shown from its link never gets one otherwise.
  const selectedIdentity = selected ? identity(selected.source) : "";
  useEffect(() => {
    if (!selected || generated.current.has(selectedIdentity)) return;
    generated.current.add(selectedIdentity);
    thumbnailFile(selected.source, ICON_PX, true).then((file) => {
      if (mounted.current && file) setFiles((current) => ({ ...current, [selectedIdentity]: file }));
    });
  }, [selectedIdentity]);
  return Object.fromEntries(wanted.map((item) => [item.id, files[item.identity]]));
}

/** The selected item's thumbnail for the detail pane, made if needed. */
export function useDetailThumbnail(source: ThumbnailSource | undefined) {
  const [file, setFile] = useState<{ id: string; file: string | null }>();
  const id = source ? identity(source) : "";
  useEffect(() => {
    if (!source) return;
    let cancelled = false;
    thumbnailFile(source, DETAIL_PX, true).then((result) => {
      if (!cancelled) setFile({ id, file: result });
    });
    return () => {
      cancelled = true;
    };
  }, [id]);
  return file?.id === id ? file.file : undefined;
}

/** A list icon: the thumbnail, or what the extension showed before thumbnails. */
export function thumbnailIcon(file: string | null | undefined, filename: string, url: string | null): Image.ImageLike {
  if (file) return { source: file };
  // The image itself from its public link only for Aktar versions without
  // thumbnails; otherwise a file icon until (or unless) there's one.
  return legacyThumbnail(filename, unsupported ? url : null);
}

/** Markdown for a thumbnail file in a detail pane. */
export function thumbnailMarkdown(file: string) {
  return `![](${pathToFileURL(file).href}?raycast-height=260)`;
}
