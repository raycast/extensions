import { processStart } from "../analysis/notify";
import { THRESHOLDS } from "../analysis/thresholds";
import { Sample, Snapshot } from "../types";

export type KeyValueStorage = {
  getItem(key: string): Promise<string | undefined>;
  setItem(key: string, value: string): Promise<void>;
};

export const HISTORY_KEY = "history.v1";
export const MAX_AGE_MS = 2 * 60 * 60 * 1000;
export const MAX_SAMPLES = 150;
const PROCS_PER_SAMPLE = 10;

export function toSample(s: Snapshot): Sample {
  const procs = [...s.processes]
    .sort((a, b) => b.energy - a.energy)
    .slice(0, PROCS_PER_SAMPLE)
    .map((p) => ({
      pid: p.pid,
      cmd: p.command,
      cpu: p.cpu,
      energy: p.energy,
      start: processStart(s.t, s.processInfo.get(p.pid)),
    }));
  return {
    t: s.t,
    wAt: s.battery.updatedAt,
    systemW: s.battery.systemLoadW,
    // pmset first: it is what macOS shows; ioreg's mAh ratio can differ right after unplugging.
    percent: s.source?.percent ?? s.battery.percent,
    onAC: s.source ? s.source.source === "ac" : s.battery.externalConnected,
    procs,
  };
}

export function prune(samples: Sample[], now: number): Sample[] {
  return samples
    .filter((s) => now - s.t <= MAX_AGE_MS)
    .sort((a, b) => a.t - b.t)
    .slice(-MAX_SAMPLES);
}

const optional = (v: unknown, type: "number" | "boolean") => v === undefined || typeof v === type;

function isProc(v: unknown): boolean {
  if (typeof v !== "object" || v === null) return false;
  const p = v as Record<string, unknown>;
  return (
    typeof p.pid === "number" &&
    typeof p.cmd === "string" &&
    typeof p.cpu === "number" &&
    typeof p.energy === "number" &&
    optional(p.start, "number")
  );
}

function isSample(v: unknown): v is Sample {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.t === "number" &&
    optional(s.wAt, "number") &&
    optional(s.systemW, "number") &&
    optional(s.percent, "number") &&
    optional(s.onAC, "boolean") &&
    Array.isArray(s.procs) &&
    s.procs.every(isProc)
  );
}

// Zero is a telemetry reset (charger unplugged), not a real draw; negatives and huge values are glitches.
function isPlausibleWatts(w: number | undefined): boolean {
  return w === undefined || (w > 0 && w <= THRESHOLDS.maxPlausibleWatts);
}

export async function loadHistory(storage: KeyValueStorage, now: number): Promise<Sample[]> {
  const raw = await storage.getItem(HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Drop malformed samples one by one; a single bad entry must not crash the commands for two hours.
    // Clear impossible wattages stored before glitch readings were filtered at the source.
    const samples = parsed
      .filter(isSample)
      .map((s) => (isPlausibleWatts(s.systemW) ? s : { ...s, systemW: undefined }));
    return prune(samples, now);
  } catch {
    return [];
  }
}

/** Both lists, one sample per time: a sample that two runs both wrote counts once. */
function merge(a: Sample[], b: Sample[]): Sample[] {
  const byTime = new Map<number, Sample>();
  for (const s of [...a, ...b]) byTime.set(s.t, s);
  return [...byTime.values()];
}

/**
 * Appends a sample. LocalStorage has no lock, and the menu bar can run twice at once (its timer and a
 * menu open), so a run that wrote in between could drop this sample: the write is read back, and if
 * another run replaced it, the two lists are merged and written once more.
 */
export async function appendSample(storage: KeyValueStorage, sample: Sample): Promise<Sample[]> {
  const history = prune([...(await loadHistory(storage, sample.t)), sample], sample.t);
  await storage.setItem(HISTORY_KEY, JSON.stringify(history));
  const stored = await loadHistory(storage, sample.t);
  if (stored.some((s) => s.t === sample.t)) return stored;
  const merged = prune(merge(stored, history), sample.t);
  await storage.setItem(HISTORY_KEY, JSON.stringify(merged));
  return merged;
}

/**
 * The stored history plus Diagnose's own samples from its full polls (every 15 s), for runaway
 * detection and process charts: with the menu bar command off, the stored history has none. Not
 * capped at MAX_SAMPLES, which would push out stored samples early at this pace; age alone limits it.
 */
export function combineHistory(stored: Sample[], local: Sample[], now: number): Sample[] {
  return merge(stored, local)
    .filter((s) => now - s.t <= MAX_AGE_MS)
    .sort((a, b) => a.t - b.t);
}
