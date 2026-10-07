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
