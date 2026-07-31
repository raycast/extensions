/**
 * Append-only log of real utilization observations. The usage endpoint only
 * reports "right now", so the menu-bar command's background poll is what builds
 * the true actual line over time.
 */
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { RateLimits, Sample } from "./types";

const MAX_SAMPLES = 5000;

function samplesPath(supportPath: string): string {
  return join(supportPath, "samples.jsonl");
}

export function readSamples(supportPath: string): Sample[] {
  const path = samplesPath(supportPath);
  if (!existsSync(path)) return [];
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return [];
  }
  const out: Sample[] = [];
  for (const line of text.split("\n")) {
    if (!line.startsWith("{")) continue;
    try {
      const s = JSON.parse(line) as Sample;
      if (typeof s.t === "number" && typeof s.weekly === "number") out.push(s);
    } catch {
      // Skip a torn line rather than losing the whole log.
    }
  }
  out.sort((a, b) => a.t - b.t);
  return out;
}

export function appendSample(supportPath: string, limits: RateLimits): void {
  if (!limits.weekly) return;
  const sample: Sample = {
    t: limits.fetchedAt,
    weekly: limits.weekly.utilization,
    fiveHour: limits.fiveHour?.utilization ?? 0,
    resetsAt: limits.weekly.resetsAt,
  };
  try {
    mkdirSync(supportPath, { recursive: true });
    const path = samplesPath(supportPath);
    // Skip a write when the previous sample is under 2 minutes old and identical.
    const existing = readSamples(supportPath);
    const last = existing[existing.length - 1];
    if (last && sample.t - last.t < 120_000 && last.weekly === sample.weekly)
      return;

    if (existing.length >= MAX_SAMPLES) {
      const kept = existing.slice(-Math.floor(MAX_SAMPLES / 2));
      writeFileSync(path, kept.map((s) => JSON.stringify(s)).join("\n") + "\n");
    }
    appendFileSync(path, JSON.stringify(sample) + "\n");
  } catch {
    // Losing a sample is not worth failing the command over.
  }
}

/** Cache the last successful API result so the view can render while offline. */
export function writeLastLimits(supportPath: string, limits: RateLimits): void {
  try {
    mkdirSync(supportPath, { recursive: true });
    writeFileSync(
      join(supportPath, "last-limits.json"),
      JSON.stringify(limits),
    );
  } catch {
    // Non-fatal.
  }
}

export function readLastLimits(supportPath: string): RateLimits | null {
  try {
    return JSON.parse(
      readFileSync(join(supportPath, "last-limits.json"), "utf8"),
    ) as RateLimits;
  } catch {
    return null;
  }
}
