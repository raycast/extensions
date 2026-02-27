import { stat } from "node:fs/promises";

/**
 * Computes the next run time for a StartInterval-based launchd job.
 */
export async function nextRunFromStartInterval(
  intervalSeconds: number,
  logPath?: string,
): Promise<Date> {
  const now = new Date();
  const intervalMs = intervalSeconds * 1000;

  if (logPath) {
    try {
      const fileStat = await stat(logPath);
      const mtime = fileStat.mtime;

      if (mtime) {
        const lastRanMs = typeof mtime === "number" ? mtime : mtime.getTime();

        let nextRunMs = lastRanMs + intervalMs;

        if (nextRunMs <= now.getTime()) {
          const elapsed = now.getTime() - lastRanMs;
          const fullIntervals = Math.ceil(elapsed / intervalMs);
          nextRunMs = lastRanMs + fullIntervals * intervalMs;
        }

        return new Date(nextRunMs);
      }
    } catch {
      // File doesn't exist or stat failed
    }
  }

  return new Date(now.getTime() + intervalMs);
}
