import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { useEffect, useState } from "react";
import { progressStep, type ProgressReport, type ProgressStep } from "./progress-estimate";
import { expectedDuration } from "./use-wait";

export type Progress = {
  /** 0…1, never backwards: a forecast from recent durations, never Mint's weight. */
  fraction: number;
  /** Files (or folder entries) Mint has read so far, when it says. */
  files?: number;
  /** Where Mint is, in its own words ("Checking Chrome Cache… 12,416 files"). */
  phase?: string;
};

export function newProgressToken(): string {
  return randomUUID().toUpperCase();
}

export function progressFile(token: string): string {
  return join(homedir(), "Library", "Application Support", "Mint", "RaycastSessions", `progress-${token}.json`);
}

/**
 * Mint 1.0.81 writes a scan's progress to a small file named by the token the
 * request carries; this reads it four times a second for Mint's phase and
 * count. The bar is forecast from how long the same scan took on its recent
 * runs, because Mint's weighted stages do not measure the share done.
 */
export function useMintProgress(token: string | undefined, active: boolean, durationKey: string): Progress | undefined {
  const [report, setReport] = useState<{ token: string; progress: Progress } | undefined>();
  useEffect(() => {
    if (!active || !token) {
      setReport(undefined);
      return;
    }
    const setProgress = (progress: Progress) => setReport({ token, progress });
    const started = Date.now();
    const expected = expectedDuration(durationKey);
    let step: ProgressStep = { fraction: 0 };
    const tick = () => {
      const seconds = (Date.now() - started) / 1000;
      let report: ProgressReport | undefined;
      try {
        report = JSON.parse(readFileSync(progressFile(token), "utf8")) as ProgressReport;
      } catch {
        // Not written yet, or a Mint that does not report.
      }
      step = progressStep(step, report, seconds, expected);
      setProgress(step);
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [token, active, durationKey]);
  // A new request must not flash the preceding request's progress before its
  // first effect/tick, or keep it when the authoritative response arrives.
  return active && report && report.token === token ? report.progress : undefined;
}
