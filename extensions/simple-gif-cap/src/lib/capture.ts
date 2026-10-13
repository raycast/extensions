import { Clipboard, environment } from "@raycast/api";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readdir, rm, stat } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { encodeGif, encodeToFit, EncodeResult, probe } from "./encode";
import { Capture, EncodeSettings, listCaptures, putCapture } from "./history";
import { outputDir, prefs } from "./prefs";
import { activeMoviePath, recordingsDir } from "./recording";

export class RecordingFailedError extends Error {
  constructor() {
    super("The recording produced no video. Check that Raycast has Screen Recording access.");
  }
}

export function defaultSettings(): EncodeSettings {
  return { fps: Number(prefs().fps), maxWidth: Number(prefs().maxWidth), start: 0 };
}

/**
 * Raycast caches images by path, so the preview shows a per-version copy of the GIF.
 */
export async function previewPath(capture: Capture): Promise<string> {
  const dir = join(environment.supportPath, "previews");
  const name = `${capture.id}-${capture.size ?? 0}.gif`;
  const path = join(dir, name);
  if (!existsSync(path) && existsSync(capture.gifPath)) {
    await mkdir(dir, { recursive: true });
    for (const stale of (await readdir(dir)).filter((file) => file.startsWith(`${capture.id}-`))) {
      await rm(join(dir, stale), { force: true });
    }
    await copyFile(capture.gifPath, path);
  }

  return path;
}

function applyResult(capture: Capture, settings: EncodeSettings, result: EncodeResult): Capture {
  return { ...capture, settings, size: result.size, width: result.width, height: result.height };
}

async function finish(capture: Capture): Promise<Capture> {
  await putCapture(capture);
  await Clipboard.copy({ file: capture.gifPath });

  return capture;
}

/** Turns a fresh recording into a GIF, saves it to history and copies it. */
export async function createCapture(
  moviePath: string,
  createdAt: number,
  options: { copy: boolean } = { copy: true },
): Promise<Capture> {
  if (!existsSync(moviePath)) {
    throw new RecordingFailedError();
  }

  await mkdir(outputDir(), { recursive: true });
  const gifPath = join(outputDir(), basename(moviePath).replace(/\.mov$/, ".gif"));
  await removeStaleTempFiles(gifPath);
  const { duration } = await probe(moviePath);
  const settings = defaultSettings();
  const result = await encodeGif(moviePath, gifPath, settings);
  const capture: Capture = { id: String(createdAt), moviePath, gifPath, createdAt, duration, settings };
  if (!options.copy) {
    await putCapture(applyResult(capture, settings, result));

    return applyResult(capture, settings, result);
  }

  return finish(applyResult(capture, settings, result));
}

/** Temp files an interrupted encode of this GIF left behind. */
async function removeStaleTempFiles(gifPath: string) {
  const prefix = `${basename(gifPath)}.`;
  const dir = dirname(gifPath);
  const stale = (await readdir(dir)).filter((file) => file.startsWith(prefix) && file.endsWith(".tmp.gif"));
  await Promise.all(stale.map((file) => rm(join(dir, file), { force: true })));
}

/**
 * Converts recordings that have no capture yet, newest first. Raycast stops a
 * command when its window closes, so closing the preview mid-conversion leaves
 * one behind.
 */
export async function convertPendingRecordings(limit = 3): Promise<number> {
  const dir = recordingsDir();
  if (!existsSync(dir)) {
    return 0;
  }

  const known = new Set((await listCaptures()).map((capture) => capture.moviePath));
  const active = await activeMoviePath();
  const movies = (await readdir(dir))
    .filter((file) => file.endsWith(".mov"))
    .map((file) => join(dir, file))
    .filter((path) => !known.has(path) && path !== active);
  const dated = await Promise.all(movies.map(async (path) => ({ path, createdAt: (await stat(path)).mtimeMs })));
  const newest = dated.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
  for (const { path, createdAt } of newest) {
    await createCapture(path, Math.round(createdAt), { copy: false });
  }

  return newest.length;
}

export async function reencode(capture: Capture, settings: EncodeSettings): Promise<Capture> {
  const result = await encodeGif(capture.moviePath, capture.gifPath, settings);

  return finish(applyResult(capture, settings, result));
}

export async function fitForSharing(capture: Capture): Promise<Capture> {
  const { result, settings } = await encodeToFit(capture.moviePath, capture.gifPath, capture.settings);

  return finish(applyResult(capture, settings, result));
}

export function trimmedDuration(capture: Capture): number {
  return (capture.settings.end ?? capture.duration) - capture.settings.start;
}
