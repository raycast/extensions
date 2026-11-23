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
/** A run holding the lock longer than this is assumed to have crashed. */
const STALE_LOCK_MS = 2 * 60 * 60 * 1000;
const MAX_REMEMBERED = 1000;

type State = {
  folder: string;
  /** Only files modified after this moment are transcribed, so enabling the watcher never processes a backlog. */
  since: number;
  done: string[];
};

const STATE_KEY = "watch-folder-state";
const LOCK_KEY = "watch-folder-lock";

async function loadState(folder: string): Promise<{ state: State; isNew: boolean }> {
  const raw = await LocalStorage.getItem<string>(STATE_KEY);
  if (raw) {
    try {
      const state = JSON.parse(raw) as State;
      if (state.folder === folder) return { state, isNew: false };
    } catch {
      // Corrupted state: start over below.
    }
  }
  return { state: { folder, since: Date.now(), done: [] }, isNew: true };
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
  const entries = await readdir(folder, { withFileTypes: true });
  const done = new Set(state.done);
  const now = Date.now();
  const found: { path: string; mtime: number }[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || entry.name.startsWith(".") || !isMediaFile(entry.name)) continue;
    const path = join(folder, entry.name);
    if (done.has(path) || existsSync(sidecarPath(path, format))) continue;
    const info = await stat(path);
    const mtime = info.mtime.getTime();
    if (mtime > state.since && now - mtime > SETTLE_MS) found.push({ path, mtime });
  }
  return found.sort((a, b) => a.mtime - b.mtime).map((item) => item.path);
}

function time(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
      try {
        await transcribeFileTo(path, sidecarPath(path, format), { format });
        transcribed++;
      } catch (error) {
        failure = `${basename(path)}: ${errorMessage(error)}`;
      }
      // Remember failures too, so a broken file is not retried every interval.
      state.done.push(path);
      await saveState(state);
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
