import { LocalStorage } from "@raycast/api";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";

const HISTORY_KEY = "history";
/** Source videos are kept for trimming and re-encoding, but only for the latest captures. */
const KEEP_VIDEOS = 20;

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

export async function listCaptures(): Promise<Capture[]> {
  const raw = await LocalStorage.getItem<string>(HISTORY_KEY);
  const captures = raw ? (JSON.parse(raw) as Capture[]) : [];

  return captures.filter((capture) => existsSync(capture.gifPath) || existsSync(capture.moviePath));
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
  const captures = (await listCaptures()).filter((existing) => existing.id !== capture.id);
  captures.unshift(capture);
  captures.sort((a, b) => b.createdAt - a.createdAt);

  for (const old of captures.slice(KEEP_VIDEOS)) {
    await rm(old.moviePath, { force: true });
  }

  await save(captures);
}

export async function deleteCapture(capture: Capture) {
  await rm(capture.gifPath, { force: true });
  await rm(capture.moviePath, { force: true });
  await save((await listCaptures()).filter((existing) => existing.id !== capture.id));
}
