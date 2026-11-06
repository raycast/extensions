import { LocalStorage, trash } from "@raycast/api";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";

const HISTORY_KEY = "history";
/** Source videos are kept for trimming and re-encoding, but only for the latest captures. */
const KEEP_VIDEOS = 20;
const KEEP_ENTRIES = 200;

export interface EncodeSettings {
  fps: number;
  /** 0 keeps the recorded width. */
  maxWidth: number;
  start: number;
  /** Seconds from the start of the video; undefined plays to the end. */
  end?: number;
}

export interface Capture {
  id: string;
  moviePath: string;
  gifPath: string;
  createdAt: number;
  duration: number;
  settings: EncodeSettings;
  size?: number;
  width?: number;
  height?: number;
}

/**
 * Everything saved, including entries whose files are gone. They stay hidden
 * rather than dropped, so a file that comes back shows up again.
 */
async function storedCaptures(): Promise<Capture[]> {
  const raw = await LocalStorage.getItem<string>(HISTORY_KEY);

  return raw ? (JSON.parse(raw) as Capture[]) : [];
}

export async function listCaptures(): Promise<Capture[]> {
  return (await storedCaptures()).filter((capture) => existsSync(capture.gifPath) || existsSync(capture.moviePath));
}

async function save(captures: Capture[]) {
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(captures));
}

export async function getCapture(id: string): Promise<Capture | undefined> {
  return (await listCaptures()).find((capture) => capture.id === id);
}

export async function findByMovie(moviePath: string): Promise<Capture | undefined> {
  return (await listCaptures()).find((capture) => capture.moviePath === moviePath);
}

export async function putCapture(capture: Capture) {
  const captures = (await storedCaptures()).filter((existing) => existing.id !== capture.id);
  captures.unshift(capture);
  captures.sort((a, b) => b.createdAt - a.createdAt);

  for (const old of captures.slice(KEEP_VIDEOS)) {
    await rm(old.moviePath, { force: true });
  }

  await save(captures.slice(0, KEEP_ENTRIES));
}

export async function deleteCapture(capture: Capture) {
  await trash([capture.gifPath, capture.moviePath].filter((path) => existsSync(path)));
  await save((await storedCaptures()).filter((existing) => existing.id !== capture.id));
}
