export type DurationKey = "until_1730" | "1h" | "4h" | "8h" | "eod" | "never";

export const DEFAULT_DURATION: DurationKey = "until_1730";

export const DURATION_OPTIONS: { key: DurationKey; title: string }[] = [
  { key: "until_1730", title: "Until 17:30" },
  { key: "1h", title: "1 hour" },
  { key: "4h", title: "4 hours" },
  { key: "8h", title: "8 hours" },
  { key: "eod", title: "End of day" },
  { key: "never", title: "Don't expire" },
];

/** Absolute point in time when the status should clear; null = never. */
export function expirationDate(key: DurationKey): Date | null {
  const now = new Date();
  switch (key) {
    case "never":
      return null;
    case "1h":
      return new Date(now.getTime() + 1 * 3600_000);
    case "4h":
      return new Date(now.getTime() + 4 * 3600_000);
    case "8h":
      return new Date(now.getTime() + 8 * 3600_000);
    case "eod": {
      const d = new Date();
      d.setHours(23, 59, 0, 0);
      if (d <= now) d.setDate(d.getDate() + 1);
      return d;
    }
    case "until_1730": {
      const d = new Date();
      d.setHours(17, 30, 0, 0);
      if (d <= now) d.setDate(d.getDate() + 1);
      return d;
    }
  }
}

/**
 * GitLab only accepts fixed clear_status_after buckets. Map the chosen
 * duration to the nearest supported bucket; null = don't send the field
 * (status never clears).
 */
const GITLAB_BUCKETS: { hours: number; value: string }[] = [
  { hours: 0.5, value: "30_minutes" },
  { hours: 3, value: "3_hours" },
  { hours: 8, value: "8_hours" },
  { hours: 24, value: "1_day" },
  { hours: 72, value: "3_days" },
  { hours: 168, value: "7_days" },
  { hours: 720, value: "30_days" },
];

export function gitlabClearAfter(key: DurationKey): string | null {
  const date = expirationDate(key);
  if (!date) return null;
  const hours = Math.max(0.1, (date.getTime() - Date.now()) / 3600_000);
  let best = GITLAB_BUCKETS[0];
  let bestDiff = Infinity;
  for (const bucket of GITLAB_BUCKETS) {
    // Relative distance so short durations don't all snap to 30 minutes.
    const diff = Math.abs(Math.log(bucket.hours / hours));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = bucket;
    }
  }
  return best.value;
}
