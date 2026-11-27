import { createHash } from "crypto";
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "fs";
import path from "path";

const KEEP_FRAMES = 6;

// Grid cells only take image files/URLs, so each terminal frame is written to an SVG file
// named by its content hash: a new name per frame makes Raycast load the fresh image
// instead of a cached one.
export function writeFrame(directory: string, svg: string) {
  const file = path.join(directory, `${createHash("sha1").update(svg).digest("hex").slice(0, 16)}.svg`);
  if (existsSync(file)) return file;
  mkdirSync(directory, { recursive: true });
  writeFileSync(file, svg);
  pruneFrames(directory, file);
  return file;
}

function pruneFrames(directory: string, keep: string) {
  try {
    const frames = readdirSync(directory)
      .filter((name) => name.endsWith(".svg"))
      .map((name) => path.join(directory, name))
      .filter((file) => file !== keep)
      .map((file) => ({ file, time: statSync(file).mtimeMs }))
      .sort((a, b) => b.time - a.time);
    // Keep a few recent frames so the one Raycast is still showing never disappears mid-load.
    for (const { file } of frames.slice(KEEP_FRAMES - 1)) rmSync(file, { force: true });
  } catch {
    // Pruning is best effort; a leftover frame is harmless.
  }
}
