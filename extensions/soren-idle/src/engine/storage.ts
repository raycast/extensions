import { LocalStorage } from "@raycast/api";
import { advance, newGame } from "./engine";
import { importSave } from "./migrate";
import { GameState, Report } from "./types";

const KEY = "soren-idle-save";
const CORRUPT_KEY = "soren-idle-save-corrupt";
const NOTICE_KEY = "soren-idle-save-notice";
/** How many times an update is redone because the other command saved in the middle of it. */
const MAX_ATTEMPTS = 4;

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

export const resetState = () => LocalStorage.removeItem(KEY);

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
 * Calls in one process run one at a time. Across processes, the save is read again just
 * before writing, and the whole update is redone if the other command got there first.
 */
export function update(
  change: (s: GameState, report: Report) => GameState = (s) => s,
): Promise<{ state: GameState; report: Report }> {
  const run = queue.then(() => attempt(change));
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
