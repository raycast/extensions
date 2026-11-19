import { environment, LocalStorage } from "@raycast/api";
import { mkdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { advance, newGame } from "./engine";
import { importSave } from "./migrate";
import { GameState, Report } from "./types";

const KEY = "soren-idle-save";
const CORRUPT_KEY = "soren-idle-save-corrupt";
const NOTICE_KEY = "soren-idle-save-notice";
/** How many times an update is redone if a write slips in despite the lock. */
const MAX_ATTEMPTS = 4;
/** A lock older than this was left behind by a command that died, and is taken over. */
const LOCK_STALE_MS = 10_000;
/** The longest anyone waits for the lock before taking it over. */
const LOCK_WAIT_MS = 15_000;

const lockDir = () => join(environment.supportPath, "save.lock");
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs `work` while holding the save lock. The Play view and the menu bar ticker are separate
 * processes, so they cannot share a mutex in memory; creating a directory is atomic, so whichever
 * command creates it first owns the save until it removes it again.
 */
export async function withSaveLock<T>(work: () => Promise<T>): Promise<T> {
  const dir = lockDir();
  await mkdir(environment.supportPath, { recursive: true });
  const started = Date.now();
  for (;;) {
    try {
      await mkdir(dir);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const age = Date.now() - ((await stat(dir).catch(() => undefined))?.mtimeMs ?? Date.now());
      if (age > LOCK_STALE_MS || Date.now() - started > LOCK_WAIT_MS) {
        await rm(dir, { recursive: true, force: true });
        continue;
      }
      await sleep(25 + Math.random() * 50);
    }
  }
  try {
    return await work();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Reads the stored save. An unreadable one is set aside, never thrown away. */
async function readState(raw: string | undefined): Promise<GameState> {
  if (!raw) return newGame();
  const { state, error } = importSave(raw);
  if (state) return state;
  await LocalStorage.setItem(CORRUPT_KEY, raw);
  await LocalStorage.setItem(NOTICE_KEY, error ?? "The save could not be read");
  return newGame();
}

export async function loadState(): Promise<GameState> {
  return readState(await LocalStorage.getItem<string>(KEY));
}

export const saveState = (s: GameState) => LocalStorage.setItem(KEY, JSON.stringify(s));

/** Replaces the save outright, such as an import. Waits its turn behind any update in progress. */
export const replaceState = (s: GameState) => withSaveLock(() => saveState(s));

export const resetState = () => withSaveLock(() => LocalStorage.removeItem(KEY));

/** A message if a save had to be set aside since the last time this was called. */
export async function takeSaveNotice(): Promise<string | undefined> {
  const notice = await LocalStorage.getItem<string>(NOTICE_KEY);
  if (notice) await LocalStorage.removeItem(NOTICE_KEY);
  return notice;
}

/** The save that could not be read, so the player can recover it by hand. */
export const corruptSave = () => LocalStorage.getItem<string>(CORRUPT_KEY);

let queue: Promise<unknown> = Promise.resolve();

/**
 * Load, catch up to the present, apply `change`, save. Every command goes through
 * this so the menu bar ticker and the play view never overwrite each other's progress.
 * Calls in one process run one at a time, and the save lock keeps the other command out for
 * the whole read, change and write. The save is also read again just before writing, as a
 * second line of defence, and the update is redone if something slipped in anyway.
 */
export function update(
  change: (s: GameState, report: Report) => GameState = (s) => s,
): Promise<{ state: GameState; report: Report }> {
  const run = queue.then(() => withSaveLock(() => attempt(change)));
  queue = run.catch(() => undefined);
  return run;
}

async function attempt(change: (s: GameState, report: Report) => GameState) {
  for (let i = 1; ; i++) {
    const raw = await LocalStorage.getItem<string>(KEY);
    const { state, report } = advance(await readState(raw), Date.now());
    const next = change(state, report);
    if (i < MAX_ATTEMPTS && (await LocalStorage.getItem<string>(KEY)) !== raw) continue;
    await saveState(next);
    return { state: next, report };
  }
}
