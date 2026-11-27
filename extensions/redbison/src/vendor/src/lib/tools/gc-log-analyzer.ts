/**
 * Analyses a JVM garbage-collection log into the figures a tuning session
 * needs: pause counts and percentiles by cause, throughput (the share of
 * wall time not spent paused), heap reclaimed per collection, an allocation
 * rate estimate, and the warning signs people grep for — Full GCs,
 * to-space exhaustion, "Metadata GC Threshold" and promotion failure.
 *
 * Two formats are read: JDK 9+ unified logging (-Xlog:gc*, lines like
 *   [1.234s][info][gc] GC(7) Pause Young (Normal) (G1 Evacuation Pause)
 *   23M->3M(64M) 0.720ms
 * including ZGC's percent-form heap figures) and the JDK 8 classic
 * -XX:+PrintGCDetails shape ([GC (Allocation Failure) ... 65536K->10736K
 * (251392K), 0.0088350 secs]). Anything else is refused by name rather
 * than half-read. References: JEP 158 (unified JVM logging) and the
 * HotSpot GC tuning guide's log examples.
 *
 * Dependency-free on purpose: the CLI bundles it, and the site parses in
 * the browser so the log never leaves the machine.
 */

export type GcEvent = {
  /** Seconds since JVM start, or epoch ms / 1000 for ISO-stamped logs. */
  at: number;
  id?: number;
  type: string;
  cause?: string;
  beforeBytes: number;
  afterBytes: number;
  totalBytes: number;
  pauseMs: number;
  full: boolean;
};

export type GcLogSummary = {
  format: 'unified' | 'jdk8';
  collector?: string;
  events: GcEvent[];
  spanSeconds: number;
  pauseCount: number;
  fullGcCount: number;
  totalPauseMs: number;
  /** 1 - pause/wall over the log's span. */
  throughput: number;
  pausePercentiles: { p50: number; p90: number; p99: number; max: number };
  byType: { type: string; count: number; totalMs: number; maxMs: number }[];
  reclaimedBytes: number;
  /** Mean of (heap growth between collections) / (time between them). */
  allocationRateBytesPerSec?: number;
  finalHeapBytes?: number;
  peakHeapBytes: number;
  warnings: string[];
};

const UNIT: Record<string, number> = { B: 1, K: 1024, M: 1024 ** 2, G: 1024 ** 3, T: 1024 ** 4 };
const mem = (num: string, unit: string): number => Math.round(parseFloat(num) * (UNIT[unit.toUpperCase()] ?? 1));

const pct = (sorted: number[], p: number): number => {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, i)];
};

/** [1.234s] or [2026-11-22T10:00:00.123+0000] -> seconds. */
function stamp(line: string): number | undefined {
  const up = line.match(/^\[(\d+(?:\.\d+)?)s\]/);
  if (up) return parseFloat(up[1]);
  const iso = line.match(/^\[([0-9T:.+-]{19,})\]/);
  if (iso) {
    const t = Date.parse(iso[1]);
    if (!Number.isNaN(t)) return t / 1000;
  }
  return undefined;
}

export function parseGcLog(text: string): GcLogSummary {
  const lines = text.split('\n');
  const events: GcEvent[] = [];
  const warnings = new Set<string>();
  let collector: string | undefined;
  let format: 'unified' | 'jdk8' | null = null;

  // Unified: the completion line carries everything at once.
  // A cause may itself hold parentheses — (System.gc()) — so the cause
  // groups allow one nested level.
  const P = String.raw`((?:[^()]|\([^()]*\))+)`;
  const UNI = new RegExp(
    String.raw`GC\((\d+)\) (Pause [^(]+?|Garbage Collection)\s*(\(${'' + P}\))?\s*(?:\(${'' + P}\)\s*)?(\d+(?:\.\d+)?)([BKMGT])(?:\(\d+%\))?->(\d+(?:\.\d+)?)([BKMGT])(?:\(\d+%\))?\((\d+(?:\.\d+)?)([BKMGT])\)(?:\s+(\d+(?:\.\d+)?)ms)?`,
  );
  // ZGC completion lines have no (total): "... 902M(9%)->302M(3%)".
  const ZGC = /GC\((\d+)\) (Garbage Collection) \(([^)]+)\)\s+(\d+)([BKMGT])\(\d+%\)->(\d+)([BKMGT])\(\d+%\)\s*$/;
  // JDK 8 classic, bracket soup included.
  // The heap totals are the LAST before->after(total) on the line — the
  // per-generation ones sit inside their own brackets earlier — so the
  // leading match is greedy on purpose.
  // Full GC lines put "[Metaspace: ...]" between the heap figures and the
  // seconds; the block is optional so plain young-GC lines still match.
  const J8 = /\[(?:Full )?GC \(([^)]+)\).*[\s\]](\d+)([KMG])->(\d+)([KMG])\((\d+)([KMG])\)(?:, \[Metaspace: [^\]]*\])?, (\d+\.\d+) secs/;
  const J8T = /^(\d+\.\d+): |^([0-9T:.+-]{19,}): /;

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!collector) {
      const using = line.match(/Using (G1|Parallel|Serial|Z Garbage Collector|ZGC|Shenandoah|Concurrent Mark Sweep)/);
      if (using) collector = using[1] === 'Z Garbage Collector' ? 'ZGC' : using[1];
    }
    if (line.includes('To-space exhausted')) warnings.add('To-space exhausted: evacuation failed at least once — the heap or the reserve is too small for the allocation spike.');
    if (line.includes('Metadata GC Threshold')) warnings.add('Collections triggered by "Metadata GC Threshold": Metaspace is forcing GCs; raise MetaspaceSize.');
    if (line.includes('promotion failed') || line.includes('Promotion failed')) warnings.add('Promotion failed: the old generation could not take survivors; expect a Full GC right after.');
    if (line.includes('Allocation Stall')) warnings.add('Allocation stall: threads waited for ZGC to free memory — the collector is not keeping up.');

    const u = line.match(UNI);
    if (u && /\dms$/.test(line)) {
      format ??= 'unified';
      // "Pause Young (Normal) (G1 Evacuation Pause)": the first paren
      // qualifies the pause type, the second is the cause.
      const type = u[5] && u[4] ? `${u[2].trim()} (${u[4]})` : u[2].trim();
      events.push({
        at: stamp(line) ?? 0,
        id: Number(u[1]),
        type,
        cause: u[5] ?? u[4],
        beforeBytes: mem(u[6], u[7]),
        afterBytes: mem(u[8], u[9]),
        totalBytes: mem(u[10], u[11]),
        pauseMs: parseFloat(u[12] ?? '0'),
        full: /Full/i.test(type),
      });
      continue;
    }
    const z = line.match(ZGC);
    if (z) {
      format ??= 'unified';
      events.push({
        at: stamp(line) ?? 0,
        id: Number(z[1]),
        type: 'Garbage Collection',
        cause: z[3],
        beforeBytes: mem(z[4], z[5]),
        afterBytes: mem(z[6], z[7]),
        totalBytes: 0,
        pauseMs: 0, // ZGC pauses are sub-ms and logged separately
        full: false,
      });
      continue;
    }
    const j = line.match(J8);
    if (j) {
      format ??= 'jdk8';
      const t = line.match(J8T);
      const at = t?.[1] ? parseFloat(t[1]) : t?.[2] ? Date.parse(t[2]) / 1000 : 0;
      events.push({
        at: Number.isFinite(at) ? at : 0,
        type: line.includes('[Full GC') ? 'Pause Full' : 'Pause Young',
        cause: j[1],
        beforeBytes: mem(j[2], j[3]),
        afterBytes: mem(j[4], j[5]),
        totalBytes: mem(j[6], j[7]),
        pauseMs: parseFloat(j[8]) * 1000,
        full: line.includes('[Full GC'),
      });
    }
  }

  if (!events.length) {
    throw new Error('No GC events found. This reads JDK 9+ unified logs (-Xlog:gc*) and JDK 8 -XX:+PrintGCDetails logs; neither shape appeared.');
  }

  const span = events.length > 1 ? events[events.length - 1].at - events[0].at : 0;
  const pauses = events.filter((e) => e.pauseMs > 0).map((e) => e.pauseMs).sort((a, b) => a - b);
  const totalPauseMs = pauses.reduce((s, v) => s + v, 0);

  const typeMap = new Map<string, { count: number; totalMs: number; maxMs: number }>();
  for (const e of events) {
    const key = e.cause ? `${e.type} (${e.cause})` : e.type;
    const agg = typeMap.get(key) ?? { count: 0, totalMs: 0, maxMs: 0 };
    agg.count += 1;
    agg.totalMs += e.pauseMs;
    agg.maxMs = Math.max(agg.maxMs, e.pauseMs);
    typeMap.set(key, agg);
  }

  // Allocation rate: heap at start of collection n, minus heap left after
  // n-1, over the time between them. Means over positive samples only.
  const rates: number[] = [];
  for (let i = 1; i < events.length; i++) {
    const dt = events[i].at - events[i - 1].at;
    const grew = events[i].beforeBytes - events[i - 1].afterBytes;
    if (dt > 0 && grew > 0) rates.push(grew / dt);
  }

  const fullGcCount = events.filter((e) => e.full).length;
  if (fullGcCount >= 3 && span > 0 && fullGcCount / (span / 60) > 1) {
    warnings.add(`${fullGcCount} Full GCs in ${span.toFixed(0)}s: more than one a minute usually means the heap is simply too small for the live set.`);
  }
  if (pauses.length && pct(pauses, 99) > 1000) warnings.add(`p99 pause ${(pct(pauses, 99) / 1000).toFixed(1)}s: anything over a second is user-visible.`);

  return {
    format: format!,
    collector,
    events,
    spanSeconds: span,
    pauseCount: pauses.length,
    fullGcCount,
    totalPauseMs,
    throughput: span > 0 ? Math.max(0, 1 - totalPauseMs / 1000 / span) : 1,
    pausePercentiles: { p50: pct(pauses, 50), p90: pct(pauses, 90), p99: pct(pauses, 99), max: pauses[pauses.length - 1] ?? 0 },
    byType: [...typeMap.entries()].map(([type, a]) => ({ type, ...a })).sort((a, b) => b.totalMs - a.totalMs),
    reclaimedBytes: events.reduce((s, e) => s + Math.max(0, e.beforeBytes - e.afterBytes), 0),
    allocationRateBytesPerSec: rates.length ? rates.reduce((s, v) => s + v, 0) / rates.length : undefined,
    finalHeapBytes: events[events.length - 1]?.afterBytes,
    peakHeapBytes: Math.max(...events.map((e) => e.beforeBytes)),
    warnings: [...warnings],
  };
}

const iec = (n: number): string => {
  if (n < 1024) return `${Math.round(n)} B`;
  const units = ['KiB', 'MiB', 'GiB', 'TiB'];
  let v = n;
  let u = -1;
  do { v /= 1024; u += 1; } while (v >= 1024 && u < units.length - 1);
  return `${v >= 100 ? Math.round(v) : v.toFixed(1)} ${units[u]}`;
};

export function renderGcLogSummary(g: GcLogSummary): string {
  const lines: string[] = [];
  // Throughput over a blink of a log is noise, not a figure.
  const thr = g.spanSeconds >= 5 ? `  ·  throughput ${(g.throughput * 100).toFixed(2)}%` : '';
  lines.push(
    `${g.events.length} collections (${g.fullGcCount} full) over ${g.spanSeconds.toFixed(1)}s${g.collector ? `  ·  ${g.collector}` : ''}${thr}`,
  );
  const p = g.pausePercentiles;
  lines.push(`pauses: p50 ${p.p50.toFixed(1)} ms, p90 ${p.p90.toFixed(1)} ms, p99 ${p.p99.toFixed(1)} ms, max ${p.max.toFixed(1)} ms  ·  total ${(g.totalPauseMs / 1000).toFixed(2)}s`);
  if (g.allocationRateBytesPerSec) lines.push(`allocation ≈ ${iec(g.allocationRateBytesPerSec)}/s  ·  reclaimed ${iec(g.reclaimedBytes)} in all  ·  peak heap ${iec(g.peakHeapBytes)}`);
  for (const w of g.warnings) lines.push('', `WARNING: ${w}`);
  lines.push('', 'by pause type');
  for (const t of g.byType.slice(0, 8)) {
    lines.push(`  ${t.count.toString().padStart(5)} ×  ${t.totalMs.toFixed(0).padStart(7)} ms total  ${t.maxMs.toFixed(1).padStart(8)} ms max  ${t.type}`);
  }
  return lines.join('\n');
}
