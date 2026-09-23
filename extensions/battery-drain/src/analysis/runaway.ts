import { Sample, Snapshot } from "../types";
import { THRESHOLDS, Thresholds } from "./thresholds";

export type Runaway = { pid: number; command: string; cpu: number; sinceSec: number };

/** Seconds of an unbroken hot streak ending at the snapshot, matched on pid and command. */
function streakSec(samples: Sample[], pid: number, command: string, now: number, th: Thresholds): number {
  let oldest = now;
  let newer = now;
  for (let i = samples.length - 1; i >= 0; i--) {
    const s = samples[i];
    if (newer - s.t > th.maxGapMs) break;
    const p = s.procs.find((x) => x.pid === pid && x.cmd === command);
    if (!p || p.cpu < th.runawayCpu) break;
    oldest = s.t;
    newer = s.t;
  }
  return (now - oldest) / 1000;
}

export function detectRunaways(samples: Sample[], snapshot: Snapshot, th: Thresholds = THRESHOLDS): Runaway[] {
  const runaways: Runaway[] = [];
  for (const p of snapshot.processes) {
    if (p.pid <= 0 || p.cpu < th.runawayCpu) continue;

    const fromHistory = streakSec(samples, p.pid, p.command, snapshot.t, th);
    const info = snapshot.processInfo.get(p.pid);
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
