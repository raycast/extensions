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

export async function readClipboardSource(offset = 0): Promise<Source> {
  const content = await Clipboard.read({ offset });
  const source = pickSource(content);
  // Older history entries are not on the system clipboard, so only offset 0 can use raw data.
  if (source.kind === "raw-image" && offset > 0) return { kind: "none" };
  return source;
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
      const url = isPostUrl(source.url) ? await findPostVideo(source.url) : fullGiphyUrl(source.url);
      const { data, name } = await download(url);
      return library.add(await toGifIfNeeded(data), name);
    }
    case "file":
      return library.add(await toGifIfNeeded(await readFile(source.path)), basename(source.path));
    case "raw-image": {
      const data = await readRawClipboardImage();
      if (!data) throw new Error("Copy an image, a GIF, or an image URL first");
      return library.add(data);
    }
    case "none":
      throw new Error("This clipboard entry has no image");
  }
}
