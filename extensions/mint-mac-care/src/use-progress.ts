import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { useEffect, useState } from "react";
import { estimatedFraction } from "./progress-estimate";
import { expectedDuration } from "./use-wait";

export type Progress = {
  /** 0…1, never backwards. */
  fraction: number;
  /** Files (or folder entries) Mint has read so far, when it says. */
  files?: number;
  /** Where Mint is, in its own words ("Checking Chrome Cache… 12,416 files"). */
  phase?: string;
  /** True on a Mint that reports nothing until it is done: estimated from the last run. */
  estimated: boolean;
};

export function newProgressToken(): string {
  return randomUUID().toUpperCase();
}

export function progressFile(token: string): string {
  return join(homedir(), "Library", "Application Support", "Mint", "RaycastSessions", `progress-${token}.json`);
}

/**
 * Mint 1.0.81 writes a request's progress to a small file named by the token
 * the request carries; this reads it four times a second. A Mint that writes
 * nothing gets an estimate from how long the same request took on its recent
 * runs, which keeps moving, more slowly, until the answer comes.
 */
export function useMintProgress(token: string | undefined, active: boolean, durationKey: string): Progress | undefined {
  const [progress, setProgress] = useState<Progress | undefined>();
  useEffect(() => {
    if (!active || !token) {
      setProgress(undefined);
      return;
    }
    const started = Date.now();
    const expected = expectedDuration(durationKey);
    let reported = false;
    let best = 0;
    const tick = () => {
      try {
        const value = JSON.parse(readFileSync(progressFile(token), "utf8")) as {
          fraction?: number;
          files?: number;
          phase?: string;
        };
        if (typeof value.fraction === "number") {
          reported = true;
          best = Math.max(best, Math.min(1, Math.max(0, value.fraction)));
          setProgress({ fraction: best, files: value.files, phase: value.phase, estimated: false });
          return;
        }
      } catch {
        // Not written yet, or a Mint that does not report.
      }
      if (reported) return;
      best = Math.max(best, estimatedFraction((Date.now() - started) / 1000, expected));
      setProgress({ fraction: best, estimated: true });
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [token, active, durationKey]);
  return progress;
}

export function progressText(progress: Progress | undefined): string {
  if (!progress) return "";
  const percent = `${progress.estimated ? "about " : ""}${Math.round(progress.fraction * 100)}%`;
  return progress.files ? `${percent} · ${progress.files.toLocaleString("en-US")} files` : percent;
}
