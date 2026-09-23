import { Sample, Snapshot } from "../types";
import { Runaway } from "./runaway";
import { THRESHOLDS, Thresholds } from "./thresholds";

export type Level = "normal" | "high" | "runaway";

type Reading = { at: number; w: number | undefined };

/**
 * Newest distinct telemetry readings. macOS refreshes watts once a minute, so samples taken
 * within that minute repeat one reading and must count once.
 */
function distinctReadings(samples: Sample[], snapshot: Snapshot): Reading[] {
  const all: Reading[] = [
    ...samples.map((s) => ({ at: s.wAt ?? s.t, w: s.systemW })),
    { at: snapshot.battery.updatedAt ?? snapshot.t, w: snapshot.battery.systemLoadW },
  ];
  const byTime = new Map<number, Reading>();
  for (const r of all) byTime.set(r.at, r);
  return [...byTime.values()].sort((a, b) => a.at - b.at);
}

function sustainedWatts(samples: Sample[], snapshot: Snapshot, th: Thresholds): boolean {
  const recent = distinctReadings(samples, snapshot).slice(-th.highWattsPoints);
  if (recent.length < th.highWattsPoints) return false;
  const noGaps = recent.every((r, i) => i === 0 || r.at - recent[i - 1].at <= th.maxGapMs);
  return noGaps && recent.every((r) => r.w !== undefined && r.w >= th.highWatts);
}

const MIN_SPACING_MS = 50_000;

/**
 * Earlier samples at least 50 s apart, walking back from `now` without crossing a sleep gap. Each menu
 * open adds a sample, so counting samples alone would let three quick opens look sustained.
 */
function spacedSamples(samples: Sample[], now: number, count: number, th: Thresholds): Sample[] {
  const picked: Sample[] = [];
  let newer = now;
  for (let i = samples.length - 1; i >= 0 && picked.length < count; i--) {
    const gap = newer - samples[i].t;
    if (gap > th.maxGapMs) break;
    if (gap < MIN_SPACING_MS) continue;
    picked.push(samples[i]);
    newer = samples[i].t;
  }
  return picked;
}

/** The same process (pid + command) at high energy now and in spaced samples over the last minutes. */
function sustainedHog(samples: Sample[], snapshot: Snapshot, th: Thresholds): boolean {
  const previous = spacedSamples(samples, snapshot.t, th.highWattsPoints - 1, th);
  if (previous.length < th.highWattsPoints - 1) return false;
  return snapshot.processes.some(
    (p) =>
      p.energy >= th.highEnergy &&
      previous.every((s) => s.procs.some((x) => x.pid === p.pid && x.cmd === p.command && x.energy >= th.highEnergy)),
  );
}

export function level(samples: Sample[], snapshot: Snapshot, runaways: Runaway[], th: Thresholds = THRESHOLDS): Level {
  if (runaways.length > 0) return "runaway";
  return sustainedWatts(samples, snapshot, th) || sustainedHog(samples, snapshot, th) ? "high" : "normal";
}
