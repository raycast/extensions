import { Clipboard, environment, getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { constants } from "node:fs";
import { copyFile, mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { imageUrl, type Artwork } from "./artworks";

const pending = new Map<string, Promise<string>>();

async function fetchImage(artwork: Artwork): Promise<string> {
  const directory = join(environment.supportPath, "images");
  const path = join(directory, `${createHash("sha256").update(artwork.image.key).digest("hex")}.webp`);
  try {
    if ((await stat(path)).size > 0) return path;
  } catch {
    /* Download images that are not cached yet. */
  }
  const response = await fetch(imageUrl(artwork), { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Image download failed (HTTP ${response.status})`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP")
    throw new Error("Museum did not return a WebP image. Try again later.");
  await mkdir(directory, { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, bytes);
  await rename(temporary, path);
  return path;
}

export function cachedImage(artwork: Artwork) {
  let request = pending.get(artwork.image.key);
  if (!request) {
    request = fetchImage(artwork).finally(() => pending.delete(artwork.image.key));
    pending.set(artwork.image.key, request);
  }
  return request;
}

export async function copyImage(artwork: Artwork) {
  await Clipboard.copy({ file: await cachedImage(artwork) });
}

export async function downloadImage(artwork: Artwork): Promise<string> {
  const source = await cachedImage(artwork);
  const directory = join(homedir(), "Downloads");
  await mkdir(directory, { recursive: true });
  const title =
    artwork.title
      .replace(/[^a-zA-Z0-9 -]/g, "")
      .trim()
      .slice(0, 80) || "Museum Artwork";
  const id = artwork.id.replace(/[^a-zA-Z0-9-]/g, "-");
  for (let suffix = 0; ; suffix++) {
    const target = join(directory, `${title}-${id}${suffix ? ` (${suffix})` : ""}.webp`);
    try {
      await copyFile(source, target, constants.COPYFILE_EXCL);
      return target;
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error;
    }
  }
}

export async function setWallpaper(artwork: Artwork) {
  if (process.platform !== "darwin") throw new Error("Setting wallpaper is supported on macOS only");
  const source = await cachedImage(artwork);
  // NSWorkspace requires a desktop-compatible image; keep the PNG in supportPath for future logins.
  const png = `${source}.png`;
  try {
    await readFile(png);
  } catch {
    await promisify(execFile)("/usr/bin/sips", ["-s", "format", "png", source, "--out", png]);
  }
  await runAppleScript(
    `
    ObjC.import('AppKit');
    function run(argv) {
      var url = $.NSURL.fileURLWithPath(argv[0]);
      var screens = $.NSScreen.screens;
      var point = $.NSEvent.mouseLocation;
      var updated = 0;
      for (var i = 0; i < screens.count; i++) {
        var screen = screens.objectAtIndex(i);
        var frame = screen.frame;
        var containsPointer = point.x >= frame.origin.x && point.x < frame.origin.x + frame.size.width && point.y >= frame.origin.y && point.y < frame.origin.y + frame.size.height;
        if (argv[1] === 'all' || containsPointer) {
          var error = Ref();
          if (!$.NSWorkspace.sharedWorkspace.setDesktopImageURLForScreenOptionsError(url, screen, $({}), error)) {
            throw new Error(error[0] ? ObjC.unwrap(error[0].localizedDescription) : 'Could not set wallpaper');
          }
          updated++;
        }
      }
      if (!updated) throw new Error('Could not find the current screen');
    }
  `,
    [png, getPreferenceValues<Preferences>().wallpaperScreen],
    { language: "JavaScript" },
  );
}
