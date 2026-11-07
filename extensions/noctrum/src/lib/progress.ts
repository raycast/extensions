import { LocalStorage } from "@raycast/api";

// Remembers which steps of a multi-step money flow (lend, borrow, repay) already succeeded,
// so a retry after a later failure resumes instead of depositing or transferring funds again.
const PREFIX = "noctrum-progress:";

export interface FlowProgress {
  step: number;
  data: Record<string, string>;
}

export async function loadProgress(key: string): Promise<FlowProgress> {
  const raw = await LocalStorage.getItem<string>(PREFIX + key);
  return raw ? (JSON.parse(raw) as FlowProgress) : { step: 0, data: {} };
}

export async function saveProgress(key: string, progress: FlowProgress): Promise<void> {
  await LocalStorage.setItem(PREFIX + key, JSON.stringify(progress));
}

export async function clearProgress(key: string): Promise<void> {
  await LocalStorage.removeItem(PREFIX + key);
}

// Flows currently running in this Raycast process. A second submit of the same flow
// (double press, or the same action from two views) is rejected instead of running in parallel.
const running = new Set<string>();

export async function runExclusive<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (running.has(key)) throw new Error("This action is already in progress");
  running.add(key);
  try {
    return await fn();
  } finally {
    running.delete(key);
  }
}
