// Live per-job utilization sampling.
//
// A persistent `srun --overlap` step (see streamJobMetrics in slurm.ts) emits one
// tick per second in this line-oriented format:
//
//   T <epochMillis>
//   G <index>, <name>, <util%>, <memUsedMiB>, <memTotalMiB>   (one per GPU, job-scoped)
//   C <cpu%|-> <memCurrentBytes> <memMaxBytes>        (job cgroup)
//   E
//
// We parse that into MetricSample[] and derive windowed averages. Everything is
// computed from samples collected since the detail view opened — stock Slurm
// keeps no per-job time series we could backfill from.

export type GpuSample = { index: number; name: string; util: number; memPct: number; memTotalMiB: number };

export type MetricSample = {
  t: number; // epoch ms
  gpus: GpuSample[];
  cpu: number | null; // % of allocated CPUs
  ram: number | null; // % of allocated memory
};

// The trailing window (in seconds) shown alongside the run average. It grows
// from 0 as the view stays open and is capped here so the figure stabilises.
export const MAX_WINDOW_SECONDS = 30;

// Extract every complete tick from the accumulated stream buffer. Returns the
// parsed samples and the unconsumed remainder (an incomplete trailing tick).
export function parseMetricStream(buffer: string): { samples: MetricSample[]; rest: string } {
  const lines = buffer.split("\n");
  let lastE = -1;
  for (let i = 0; i < lines.length; i++) if (lines[i].trim() === "E") lastE = i;
  if (lastE < 0) return { samples: [], rest: buffer };

  const rest = lines.slice(lastE + 1).join("\n");
  const samples: MetricSample[] = [];
  let cur: MetricSample | null = null;

  for (const raw of lines.slice(0, lastE + 1)) {
    const line = raw.trim();
    if (line.startsWith("T ")) {
      cur = { t: Number(line.slice(2)) || Date.now(), gpus: [], cpu: null, ram: null };
    } else if (line.startsWith("G ") && cur) {
      // "G <index>, <name>, <util>, <memUsedMiB>, <memTotalMiB>"
      const parts = line.slice(2).split(",");
      const [idxS, ...rest] = parts;
      const [totalS, usedS, utilS, ...namePartsReversed] = rest.reverse();
      const idx = Number(idxS);
      const name = namePartsReversed.reverse().join(",").trim();
      const util = Number(utilS);
      const used = Number(usedS);
      const total = Number(totalS);
      if (Number.isFinite(idx) && Number.isFinite(util) && total > 0) {
        cur.gpus.push({ index: idx, name, util, memPct: (used / total) * 100, memTotalMiB: total });
      }
    } else if (line.startsWith("C ") && cur) {
      const [cpuS, memcS, memmS] = line.slice(2).split(/\s+/);
      cur.cpu = cpuS === "-" ? null : finiteOrNull(Number(cpuS));
      const memc = Number(memcS);
      const memm = Number(memmS);
      cur.ram = memm > 0 && Number.isFinite(memc) ? (memc / memm) * 100 : null;
    } else if (line === "E" && cur) {
      cur.gpus.sort((a, b) => a.index - b.index);
      samples.push(cur);
      cur = null;
    }
  }
  return { samples, rest };
}

// Number of GPUs the job exposes, taken from the most recent sample.
export function gpuCount(samples: MetricSample[]): number {
  for (let i = samples.length - 1; i >= 0; i--) if (samples[i].gpus.length) return samples[i].gpus.length;
  return 0;
}

// Average of `pick` over samples no older than `sinceMs` (use 0 for "all").
export function windowAvg(
  samples: MetricSample[],
  sinceMs: number,
  pick: (s: MetricSample) => number | null,
): number | null {
  let sum = 0;
  let n = 0;
  for (const s of samples) {
    if (s.t < sinceMs) continue;
    const v = pick(s);
    if (v != null && Number.isFinite(v)) {
      sum += v;
      n++;
    }
  }
  return n ? sum / n : null;
}

// Seconds of the trailing window to show: time since the view opened, capped.
export function windowSeconds(openedAt: number, now: number): number {
  return Math.min(MAX_WINDOW_SECONDS, Math.max(0, Math.round((now - openedAt) / 1000)));
}

function finiteOrNull(n: number): number | null {
  return Number.isFinite(n) ? n : null;
}
