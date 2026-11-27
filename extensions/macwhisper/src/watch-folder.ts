import {
  environment,
  getPreferenceValues,
  LaunchType,
  LocalStorage,
  showHUD,
  updateCommandMetadata,
} from "@raycast/api";
import { existsSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { isMediaFile, sidecarPath } from "./lib/files";
import { errorMessage, expandHome, OutputFormat, transcribeFileTo } from "./lib/mw";

/** Files modified less than this long ago may still be recording or downloading. */
const SETTLE_MS = 60_000;
/**
 * A run holding the lock longer than this is assumed to have crashed or been terminated by Raycast,
 * which ends background runs after a timeout tied to the command's interval (10m in package.json).
 */
const STALE_LOCK_MS = 10 * 60 * 1000;
const MAX_REMEMBERED = 1000;

type State = {
  folder: string;
  /** Recordings already in the folder when watching started: never transcribed, so there is no backlog. */
  baseline: string[];
  done: string[];
};

/** State saved by earlier versions, which filtered by modification time instead of a baseline. */
type LegacyState = Omit<State, "baseline"> & { baseline?: string[]; since?: number };

const STATE_KEY = "watch-folder-state";
const LOCK_KEY = "watch-folder-lock";

/** Media files directly inside `folder`, with the last time each one changed or arrived there. */
async function mediaFiles(folder: string): Promise<{ path: string; changedAt: number }[]> {
  const entries = await readdir(folder, { withFileTypes: true });
  const files: { path: string; changedAt: number }[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || entry.name.startsWith(".") || !isMediaFile(entry.name)) continue;
    const path = join(folder, entry.name);
    const info = await stat(path);
    // ctime also moves when a file is moved or renamed into the folder, unlike mtime.
    files.push({ path, changedAt: Math.max(info.mtimeMs, info.ctimeMs) });
  }
  return files;
}

async function loadState(folder: string): Promise<{ state: State; isNew: boolean }> {
  const raw = await LocalStorage.getItem<string>(STATE_KEY);
  if (raw) {
    try {
      const saved = JSON.parse(raw) as LegacyState;
      if (saved.folder === folder) {
        if (saved.baseline) return { state: { ...saved, baseline: saved.baseline }, isNew: false };
        // Migrate: files that changed before the old cut-off were the backlog.
        const since = saved.since ?? Date.now();
        const baseline = (await mediaFiles(folder)).filter((file) => file.changedAt <= since).map((file) => file.path);
        return { state: { folder, baseline, done: saved.done ?? [] }, isNew: false };
      }
    } catch {
      // Corrupted state: start over below.
    }
  }
  const baseline = (await mediaFiles(folder)).map((file) => file.path);
  return { state: { folder, baseline, done: [] }, isNew: true };
}

async function saveState(state: State) {
  await LocalStorage.setItem(STATE_KEY, JSON.stringify({ ...state, done: state.done.slice(-MAX_REMEMBERED) }));
}

async function acquireLock(): Promise<boolean> {
  const lockedAt = await LocalStorage.getItem<number>(LOCK_KEY);
  if (lockedAt && Date.now() - lockedAt < STALE_LOCK_MS) return false;
  await LocalStorage.setItem(LOCK_KEY, Date.now());
  return true;
}

async function newRecordings(folder: string, state: State, format: OutputFormat): Promise<string[]> {
  const skip = new Set([...state.baseline, ...state.done]);
  const now = Date.now();
  return (await mediaFiles(folder))
    .filter((file) => !skip.has(file.path) && !existsSync(sidecarPath(file.path, format)))
    .filter((file) => now - file.changedAt > SETTLE_MS)
    .sort((a, b) => a.changedAt - b.changedAt)
    .map((file) => file.path);
}

function time(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** One watch run. Throws when the folder or the saved state cannot be read; Command reports it. */
async function watchOnce(folder: string, format: OutputFormat, userInitiated: boolean) {
  const folderName = basename(folder);
  const { state, isNew } = await loadState(folder);
  if (isNew) {
    await saveState(state);
    await updateCommandMetadata({ subtitle: `Watching ${folderName}` });
    if (userInitiated) await showHUD(`Watching ${folderName}: new recordings get a .${format} transcript`);
    return;
  }

  if (!(await acquireLock())) {
    if (userInitiated) await showHUD("A transcription run is already in progress");
    return;
  }

  let transcribed = 0;
  let failure: string | undefined;
  try {
    for (const path of await newRecordings(folder, state, format)) {
      // Remember the file before transcribing: if the run fails or Raycast terminates it,
      // the same recording is not retried (and killed again) every interval.
      state.done.push(path);
      await saveState(state);
      try {
        await transcribeFileTo(path, sidecarPath(path, format), { format });
        transcribed++;
      } catch (error) {
        failure = `${basename(path)}: ${errorMessage(error)}`;
      }
    }
  } finally {
    await LocalStorage.removeItem(LOCK_KEY);
  }

  const summary = failure
    ? `Watching ${folderName} · error at ${time()}`
    : `Watching ${folderName} · ${transcribed > 0 ? `${transcribed} transcribed at ${time()}` : `checked at ${time()}`}`;
  await updateCommandMetadata({ subtitle: summary });
  if (userInitiated) {
    await showHUD(
      failure
        ? `Transcription failed for ${failure}`
        : `${transcribed} new recording${transcribed === 1 ? "" : "s"} transcribed`,
    );
  }
}

export default async function Command() {
  const { watchedFolder, watchFormat } = getPreferenceValues<Preferences.WatchFolder>();
  const folder = expandHome(watchedFolder);
  const format: OutputFormat = (["txt", "srt", "vtt", "md"] as const).find((value) => value === watchFormat) ?? "txt";
  const userInitiated = environment.launchType === LaunchType.UserInitiated;
  const folderName = basename(folder);

  if (!existsSync(folder)) {
    await updateCommandMetadata({ subtitle: `Folder not found: ${folderName}` });
    if (userInitiated) await showHUD(`Watched folder not found: ${folder}`);
    return;
  }

  try {
    await watchOnce(folder, format, userInitiated);
  } catch (error) {
    await updateCommandMetadata({ subtitle: `Watching ${folderName} · error at ${time()}` });
    if (userInitiated) await showHUD(`Watch Folder failed: ${errorMessage(error)}`);
  }
}
