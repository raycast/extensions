import type { ApplicationInfo, AppUsage, Counters, NetworkSnapshot, ProcessInfo, RawSample, SortBy } from "../types";
import { basename } from "node:path";
import { attributeProcess } from "./processes";

export const QUIET_BYTES_PER_SECOND = 1000;
const HISTORY_MS = 120_000;

/** Counter baselines are tied to PID + launch time so reuse and counter resets cannot create spikes. */
export class UsageSession {
  private previous: { sample: RawSample; counters: Map<string, Counters> } | null = null;
  private apps = new Map<string, AppUsage>();
  private startedAt = 0;
  private sampledSeconds = 0;

  resetBaseline() {
    this.previous = null;
    // A pause is an unobserved gap, not zero traffic on the chart.
    for (const app of this.apps.values()) app.history = [];
  }

  ingest(
    sample: RawSample,
    processes: Map<number, ProcessInfo>,
    applications: Map<string, ApplicationInfo>,
    uid: number,
  ): NetworkSnapshot | null {
    const counters = new Map(
      sample.rows.map((row) => [`${row.pid}:${processes.get(row.pid)?.startedAt ?? "unknown"}`, row]),
    );
    const previous = this.previous;
    this.previous = { sample, counters };
    if (!this.startedAt) this.startedAt = sample.timestamp;
    if (!previous) return null;
    const seconds = (sample.monotonicMs - previous.sample.monotonicMs) / 1000;
    if (seconds <= 0) return null;
    // A sleeping Mac can leave old socket totals around. Do not present the gap as a live rate.
    if (seconds > 10) {
      this.resetBaseline();
      return null;
    }
    this.sampledSeconds += seconds;
    const next = new Map<string, AppUsage>();
    for (const [id, app] of this.apps) {
      if (app.downloadedBytes + app.uploadedBytes > 0) {
        next.set(id, { ...app, downloadBps: 0, uploadBps: 0, processes: [], history: [...app.history] });
      }
    }
    for (const [key, row] of counters) {
      const old = previous.counters.get(key);
      // The first sighting is a baseline, including processes that appear mid-session.
      const bytesIn = old ? Math.max(0, row.bytesIn - old.bytesIn) : 0;
      const bytesOut = old ? Math.max(0, row.bytesOut - old.bytesOut) : 0;
      const attribution = attributeProcess(row, processes, applications, uid);
      let app = next.get(attribution.id);
      if (!app) {
        app = {
          ...attribution,
          downloadBps: 0,
          uploadBps: 0,
          downloadedBytes: 0,
          uploadedBytes: 0,
          processes: [],
          history: [],
        };
        next.set(app.id, app);
      }
      // Mixed-ownership helpers must never make a system process actionable.
      app.isSystem ||= attribution.isSystem;
      app.downloadBps += bytesIn / seconds;
      app.uploadBps += bytesOut / seconds;
      app.downloadedBytes += bytesIn;
      app.uploadedBytes += bytesOut;
      const info = processes.get(row.pid);
      if (info)
        app.processes.push({
          ...info,
          name: basename(info.executable),
          downloadBps: bytesIn / seconds,
          uploadBps: bytesOut / seconds,
        });
    }
    for (const app of next.values()) {
      app.history = [
        ...app.history.filter((point) => point.timestamp > sample.timestamp - HISTORY_MS),
        {
          timestamp: sample.timestamp,
          downloadBps: app.downloadBps,
          uploadBps: app.uploadBps,
        },
      ].slice(-60);
    }
    this.apps = next;
    return {
      timestamp: sample.timestamp,
      startedAt: this.startedAt,
      sampledSeconds: this.sampledSeconds,
      apps: [...next.values()],
    };
  }
}

export function combinedRate(app: AppUsage) {
  return app.downloadBps + app.uploadBps;
}

export function sortApps(apps: AppUsage[], sort: SortBy = "combined"): AppUsage[] {
  const rate =
    sort === "download"
      ? (app: AppUsage) => app.downloadBps
      : sort === "upload"
        ? (app: AppUsage) => app.uploadBps
        : combinedRate;
  return [...apps].sort((a, b) => rate(b) - rate(a) || a.name.localeCompare(b.name));
}

export function visibleApps(snapshot: NetworkSnapshot, hideSystem: boolean): AppUsage[] {
  return snapshot.apps.filter((app) => !hideSystem || !app.isSystem);
}
