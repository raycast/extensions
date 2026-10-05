import { ProcessEnergy, ProcessInfo, Sample } from "../types";

export type AppUsage = { name: string; energy: number; cpu: number; pids: number[] };

/** "/Applications/Microsoft Teams.app/…/Helper.app/…" → "Microsoft Teams"; plain binaries keep their name. */
export function appName(path: string | undefined, fallback: string): string {
  const m = path ? /\/([^/]+)\.app(?:\/|$)/.exec(path) : null;
  return m ? m[1] : fallback;
}

/**
 * Sums each app's processes so helpers count toward the app the user recognizes. Only processes inside
 * an .app bundle count: system processes and command-line tools are listed under Processes instead.
 */
export function groupByApp(processes: ProcessEnergy[], info: Map<number, ProcessInfo>): AppUsage[] {
  const apps = new Map<string, AppUsage>();
  for (const p of processes) {
    const path = info.get(p.pid)?.path;
    if (!bundlePath(path)) continue;
    const name = appName(path, p.command);
    const app = apps.get(name) ?? { name, energy: 0, cpu: 0, pids: [] };
    app.energy += p.energy;
    app.cpu += p.cpu;
    app.pids.push(p.pid);
    apps.set(name, app);
  }
  return [...apps.values()].sort((a, b) => b.energy - a.energy);
}

/** "/Applications/Microsoft Teams.app/Contents/…" → "/Applications/Microsoft Teams.app"; undefined outside a bundle. */
export function bundlePath(path: string | undefined): string | undefined {
  const m = path ? /^(.*?\/[^/]+\.app)(?:\/|$)/.exec(path) : null;
  return m ? m[1] : undefined;
}

/**
 * An app's CPU over the stored history: the sum of its current processes in each sample they appear
 * in, then `now`. Stored samples carry no path, so the app's current pids stand in for it.
 */
export function appCpuSeries(history: Sample[], pids: number[], now: number, cpu: number): { t: number; w: number }[] {
  const mine = new Set(pids);
  // Samples keep the top 10 processes by energy; an app with none among them reads 0, not a gap.
  // Samples whose processes were not measured (top failed) are skipped rather than drawn as 0.
  const past = history
    .filter((s) => !s.procsMissing)
    .map((s) => ({
      t: s.t,
      w: s.procs.filter((p) => mine.has(p.pid)).reduce((sum, p) => sum + p.cpu, 0),
    }));
  return [...past, { t: now, w: cpu }];
}
