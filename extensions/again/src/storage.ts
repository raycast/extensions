import { LaunchType, LocalStorage, launchCommand } from "@raycast/api";
import { Day, Outcome, State, autoClose, dayKey } from "./logic";

const KEY = "again.v1";
const OUTCOMES: Outcome[] = ["done", "some", "not"];

export const todayKey = () => dayKey(new Date());

// Keeps only entries that look like days, so a hand-edited or damaged value cannot crash the commands.
function parseState(raw: string): State | null {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.days !== "object" || parsed.days === null) return null;
    const days: Record<string, Day> = {};
    for (const [k, v] of Object.entries<Record<string, unknown>>(parsed.days)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !v || typeof v !== "object" || typeof v.promise !== "string") continue;
      const day: Day = { promise: v.promise };
      if (OUTCOMES.includes(v.outcome as Outcome)) day.outcome = v.outcome as Outcome;
      if (OUTCOMES.includes(v.prev as Outcome)) day.prev = v.prev as Outcome;
      if (v.auto === true) day.auto = true;
      if (v.counted === true) day.counted = true;
      days[k] = day;
    }
    return { days };
  } catch {
    return null;
  }
}

// Reads the saved days and closes any day left open, in memory only. Reading never overwrites the saved value,
// so the background menu bar refresh cannot erase a change made in the list. The closed days are saved with
// the next change. A read error is not treated as "no days": it throws, so nothing is written over what is there.
// A value that cannot be parsed is kept as a backup.
async function read(today: string): Promise<{ state: State; raw: string | undefined }> {
  const raw = await LocalStorage.getItem<string>(KEY);
  let state: State = { days: {} };
  if (raw) {
    const parsed = parseState(raw);
    if (parsed) state = parsed;
    else await LocalStorage.setItem(`${KEY}.bak`, raw);
  }
  return { state: autoClose(state, today), raw };
}

export const loadState = async (): Promise<State> => (await read(todayKey())).state;

// Thrown when a screen drawn for one day is used after the day turned at 4 a.m.
export class StaleDayError extends Error {}

// Every change re-reads what is saved and works out today once, so a click in the menu bar and a click in the
// list cannot overwrite each other, and a pick made just after 4 a.m. lands on the right day. LocalStorage has no
// atomic update, so the value is read again just before the write: if another command saved in between, the change
// is worked out again from the newer value. `expectedDay` is the day the screen was drawn for.
export async function mutate(
  change: (state: State, today: string) => State,
  options: { refreshMenuBar?: boolean; expectedDay?: string } = {},
): Promise<State> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const today = todayKey();
    if (options.expectedDay && options.expectedDay !== today) throw new StaleDayError();
    const { state, raw } = await read(today);
    const next = change(state, today);
    if (next !== state) {
      if ((await LocalStorage.getItem<string>(KEY)) !== raw) continue;
      await LocalStorage.setItem(KEY, JSON.stringify(next));
    }
    if (options.refreshMenuBar !== false) await refreshMenuBar();
    return next;
  }
  throw new Error("Another change was being saved at the same time. Try again.");
}

// The menu bar item only redraws when its command runs, so the list asks it to run after each change.
// It throws when the person has not turned the menu bar item on; that is fine.
export async function refreshMenuBar() {
  try {
    await launchCommand({ name: "menu-bar", type: LaunchType.Background });
  } catch {
    // Menu bar command not activated.
  }
}

export async function deleteAll() {
  await LocalStorage.removeItem(KEY);
  await LocalStorage.removeItem(`${KEY}.bak`);
  await refreshMenuBar();
}
