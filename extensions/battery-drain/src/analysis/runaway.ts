import { Sample, Snapshot } from "../types";
import { processStart, sameCommand, sameStart } from "./notify";
import { THRESHOLDS, Thresholds } from "./thresholds";

export type Runaway = { pid: number; command: string; cpu: number; sinceSec: number };

/**
 * Once flagged, a process keeps the flag through readings down to this share of the threshold. A single
 * low reading, such as the first one Diagnose takes while it starts (72% for a process otherwise at 84%),
 * must not hide a runaway that has been running for half an hour.
 */
export const RUNAWAY_EXIT_SHARE = 0.75;

/**
 * Seconds of the hot streak ending at the snapshot, matched on pid, command and, when both are known,
 * start time: an old process of the same name on a reused pid must not lend the new one its streak.
 * The streak counts readings at or above the threshold; once it has lasted long enough to be flagged,
 * readings down to RUNAWAY_EXIT_SHARE of the threshold carry it on instead of ending it.
 */
function streakSec(
  samples: Sample[],
  pid: number,
  command: string,
  start: number | undefined,
  now: number,
  nowCpu: number,
  th: Thresholds,
): number {
  const exitCpu = th.runawayCpu * RUNAWAY_EXIT_SHARE;
  const readings = samples
    // top failed on that run: no process was measured, which says nothing about this one.
    .filter((s) => !s.procsMissing && s.t <= now)
    .map((s) => ({
      t: s.t,
      cpu: s.procs.find((x) => x.pid === pid && sameCommand(x.cmd, command) && sameStart(x.start, start))?.cpu,
    }));
  readings.push({ t: now, cpu: nowCpu });

  let since: number | undefined;
  let flagged = false;
  let previous: number | undefined;
  for (const r of readings) {
    const gap = previous !== undefined && r.t - previous > th.maxGapMs;
    previous = r.t;
    if (gap || r.cpu === undefined || r.cpu < (flagged ? exitCpu : th.runawayCpu)) {
      since = undefined;
      flagged = false;
      // A reading after a gap or a reset can start a new streak by itself.
      if (r.cpu === undefined || r.cpu < th.runawayCpu) continue;
    }
    since ??= r.t;
    if (r.t - since >= th.runawayMinSec * 1000) flagged = true;
  }
  return since === undefined ? 0 : (now - since) / 1000;
}

export function detectRunaways(samples: Sample[], snapshot: Snapshot, th: Thresholds = THRESHOLDS): Runaway[] {
  const runaways: Runaway[] = [];
  for (const p of snapshot.processes) {
    if (p.pid <= 0 || p.cpu < th.runawayCpu * RUNAWAY_EXIT_SHARE) continue;

    const info = snapshot.processInfo.get(p.pid);
    const fromHistory = streakSec(samples, p.pid, p.command, processStart(snapshot.t, info), snapshot.t, p.cpu, th);
    const fromCpuTime =
      info && info.etimeSec >= th.runawayMinSec && info.cpuTimeSec / info.etimeSec >= th.runawayCpu / 100
        ? info.etimeSec
        : 0;

    const sinceSec = Math.max(fromHistory, fromCpuTime);
    if (sinceSec >= th.runawayMinSec) {
      runaways.push({ pid: p.pid, command: p.command, cpu: p.cpu, sinceSec });
    }
  }
  return runaways.sort((a, b) => b.sinceSec - a.sinceSec);
}
