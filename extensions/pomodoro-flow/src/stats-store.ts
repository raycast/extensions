import { LocalStorage } from "@raycast/api";

const STATS_KEY = "pomodoro-flow.completions.v1";

export async function loadCompletions(): Promise<number[]> {
  const raw = await LocalStorage.getItem<string>(STATS_KEY);
  if (!raw) return [];
  try {
    const values = JSON.parse(raw) as unknown[];
    return values.filter(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value),
    );
  } catch {
    return [];
  }
}

export async function recordCompletion(timestamp = Date.now()) {
  const values = await loadCompletions();
  if (values.some((value) => Math.abs(value - timestamp) < 10_000)) return;
  const cutoff = new Date(2020, 0, 1).getTime();
  const updated = [
    ...values.filter((value) => value >= cutoff),
    timestamp,
  ].sort((a, b) => a - b);
  await LocalStorage.setItem(STATS_KEY, JSON.stringify(updated));
}
