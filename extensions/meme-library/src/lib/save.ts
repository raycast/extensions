import { Clipboard, getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { promisify } from "node:util";
import {
  download,
  findPostVideo,
  fullGiphyUrl,
  isAnimatedWebp,
  isPostUrl,
  isVideo,
  Library,
  Meme,
  pickSource,
  Source,
  videoToGif,
} from "./library";

export function getLibrary(): Library {
  const { libraryFolder } = getPreferenceValues<Preferences>();
  return new Library(libraryFolder);
}

// macOS keeps a copied bitmap (for example from Preview or a screenshot) only as raw data.
// The Raycast clipboard API cannot return it, so AppleScript writes it to a PNG file.
async function readRawClipboardImage(): Promise<Buffer | undefined> {
  const target = join(tmpdir(), `meme-library-${Date.now()}.png`);
  try {
    await promisify(execFile)("/usr/bin/osascript", [
      "-e",
      `set f to open for access POSIX file ${JSON.stringify(target)} with write permission`,
      "-e",
      "try",
      "-e",
      "write (the clipboard as «class PNGf») to f",
      "-e",
      "end try",
      "-e",
      "close access f",
    ]);
    const data = await readFile(target);
    return data.length > 0 ? data : undefined;
  } catch {
    return undefined;
  } finally {
    await rm(target, { force: true });
  }
}

// Set capture to read a raw image now. Clipboard history needs this, because the clipboard can
// change before the user picks an entry.
export async function readClipboardSource(offset = 0, capture = false): Promise<Source> {
  const content = await Clipboard.read({ offset });
  return withRawImage(pickSource(content), offset, capture);
}

async function withRawImage(source: Source, offset: number, capture: boolean): Promise<Source> {
  if (source.kind === "url" && source.fallback) {
    const fallback = await withRawImage(source.fallback, offset, capture);
    return { ...source, fallback: fallback.kind === "none" ? undefined : fallback };
  }
  if (source.kind !== "raw-image") return source;
  // Older history entries are not on the system clipboard, so only offset 0 can use raw data.
  if (offset > 0) return { kind: "none" };
  if (!capture) return source;
  const data = await readRawClipboardImage();
  return data ? { kind: "raw-image", data } : { kind: "none" };
}

// Videos and animated WebP files become GIFs, so they loop in every app. If ffmpeg cannot read
// an animated WebP (older ffmpeg versions), the WebP is saved as it is.
export async function toGifIfNeeded(data: Buffer): Promise<Buffer> {
  if (isVideo(data)) return videoToGif(data);
  if (isAnimatedWebp(data)) return videoToGif(data, ".webp").catch(() => data);
  return data;
}

export async function saveSource(library: Library, source: Source): Promise<{ meme: Meme; duplicate: boolean }> {
  switch (source.kind) {
    case "url": {
      try {
        const url = isPostUrl(source.url) ? await findPostVideo(source.url) : fullGiphyUrl(source.url);
        const { data, name } = await download(url);
        return library.add(await toGifIfNeeded(data), name);
      } catch (error) {
        // Some images need browser cookies or are copied offline. Their pixels are still on the clipboard.
        if (!source.fallback) throw error;
        return saveSource(library, source.fallback).catch(() => Promise.reject(error));
      }
    }
    case "file":
      return library.add(await toGifIfNeeded(await readFile(source.path)), basename(source.path));
    case "raw-image": {
      const data = source.data ?? (await readRawClipboardImage());
      if (!data) throw new Error("Copy an image, a GIF, or an image URL first");
      return library.add(data);
    }
    case "none":
      throw new Error("Copy an image, a GIF, or an image URL first");
  }
}
