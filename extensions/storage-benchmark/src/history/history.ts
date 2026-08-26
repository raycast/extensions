import type { BenchmarkRunConfiguration } from "../benchmark/engine";
import { BenchmarkResult, BenchmarkVolume } from "../benchmark/protocol";

const HISTORY_STORAGE_KEY = "disk-speed-history-v1";
const MAX_SUCCESSFUL_RUNS_PER_VOLUME = 20;
const MAX_DIAGNOSTICS = 5;
const BASELINE_CONFIRMATION_TOLERANCE = 0.1;

export interface HistoryKeyValueStore {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
}

export type StoredBenchmarkConfiguration = Omit<BenchmarkRunConfiguration, "directory">;

export interface BenchmarkRunInput {
  id: string;
  completedAt: string;
  volume: BenchmarkVolume;
  result: BenchmarkResult;
  configuration: StoredBenchmarkConfiguration;
}

export type StoredBenchmarkRun = BenchmarkRunInput;

export interface StoredDiagnostic {
  id: string;
  completedAt: string;
  status: "cancelled" | "failed";
  code: string;
  message: string;
  volume?: BenchmarkVolume;
}

export interface BaselineReference {
  runId: string;
  status: "provisional" | "confirmed";
  result: BenchmarkResult;
}

export interface VolumeHistory {
  volume: BenchmarkVolume;
  successfulRuns: StoredBenchmarkRun[];
  baselines: Record<string, BaselineReference>;
}

export interface HistorySnapshot {
  schemaVersion: 1;
  volumes: Record<string, VolumeHistory>;
  diagnostics: StoredDiagnostic[];
}

export class BenchmarkHistory {
  constructor(private readonly store: HistoryKeyValueStore) {}

  async snapshot(): Promise<HistorySnapshot> {
    return structuredClone(await this.load());
  }

  async recordSuccess(input: BenchmarkRunInput): Promise<void> {
    const document = await this.load();
    const volume = document.volumes[input.volume.id] ?? {
      volume: input.volume,
      successfulRuns: [],
      baselines: {},
    };

    volume.volume = input.volume;
    volume.successfulRuns = [input, ...volume.successfulRuns.filter((run) => run.id !== input.id)].sort((left, right) =>
      right.completedAt.localeCompare(left.completedAt),
    );

    const key = compatibilityKey(input);
    const baseline = volume.baselines[key];
    if (!baseline) {
      volume.baselines[key] = { runId: input.id, status: "provisional", result: input.result };
    } else if (baseline.status === "provisional" && baseline.runId !== input.id) {
      if (resultsAreClose(baseline.result, input.result)) {
        volume.baselines[key] = { ...baseline, status: "confirmed" };
      }
    }

    volume.successfulRuns = retainRecentRuns(volume.successfulRuns);
    document.volumes[input.volume.id] = volume;
    await this.save(document);
  }

  async setBaseline(volumeId: string, key: string, runId: string): Promise<void> {
    const document = await this.load();
    const volume = document.volumes[volumeId];
    const run = volume?.successfulRuns.find((candidate) => candidate.id === runId);
    if (!volume || !run || compatibilityKey(run) !== key) {
      throw new Error("Cannot set a baseline from a missing or incompatible run");
    }

    volume.baselines[key] = { runId, status: "confirmed", result: run.result };
    await this.save(document);
  }

  async recordDiagnostic(diagnostic: StoredDiagnostic): Promise<void> {
    const document = await this.load();
    document.diagnostics = [diagnostic, ...document.diagnostics.filter((item) => item.id !== diagnostic.id)]
      .sort((left, right) => right.completedAt.localeCompare(left.completedAt))
      .slice(0, MAX_DIAGNOSTICS);
    await this.save(document);
  }

  async resetBaseline(volumeId: string, key: string): Promise<void> {
    const document = await this.load();
    const volume = document.volumes[volumeId];
    if (!volume) return;
    delete volume.baselines[key];
    if (volume.successfulRuns.length === 0 && Object.keys(volume.baselines).length === 0) {
      delete document.volumes[volumeId];
    }
    await this.save(document);
  }

  async deleteRun(volumeId: string, runId: string): Promise<void> {
    const document = await this.load();
    const volume = document.volumes[volumeId];
    if (!volume) return;

    volume.successfulRuns = volume.successfulRuns.filter((run) => run.id !== runId);
    for (const [key, baseline] of Object.entries(volume.baselines)) {
      if (baseline.runId === runId) delete volume.baselines[key];
    }
    if (volume.successfulRuns.length === 0 && Object.keys(volume.baselines).length === 0) {
      delete document.volumes[volumeId];
    }
    await this.save(document);
  }

  async deleteVolume(volumeId: string): Promise<void> {
    const document = await this.load();
    delete document.volumes[volumeId];
    await this.save(document);
  }

  private async load(): Promise<HistorySnapshot> {
    const raw = await this.store.get(HISTORY_STORAGE_KEY);
    if (!raw) return emptyHistory();

    try {
      const parsed = JSON.parse(raw) as HistorySnapshot;
      if (parsed.schemaVersion !== 1 || typeof parsed.volumes !== "object" || parsed.volumes === null) {
        return emptyHistory();
      }
      for (const volume of Object.values(parsed.volumes)) {
        for (const [key, baseline] of Object.entries(volume.baselines ?? {})) {
          if (baseline.result) continue;
          const baselineRun = volume.successfulRuns.find((run) => run.id === baseline.runId);
          if (baselineRun) {
            baseline.result = baselineRun.result;
          } else {
            delete volume.baselines[key];
          }
        }
      }
      return { ...parsed, diagnostics: Array.isArray(parsed.diagnostics) ? parsed.diagnostics : [] };
    } catch {
      return emptyHistory();
    }
  }

  private async save(document: HistorySnapshot): Promise<void> {
    await this.store.set(HISTORY_STORAGE_KEY, JSON.stringify(document));
  }
}

export function compatibilityKey(run: Pick<BenchmarkRunInput, "result" | "configuration">): string {
  const configuration = run.configuration;
  return [
    run.result.methodologyVersion,
    configuration.maxBytes,
    configuration.warmupBytes,
    configuration.targetDurationSeconds,
    configuration.chunkSizeBytes,
  ].join(":");
}

function emptyHistory(): HistorySnapshot {
  return { schemaVersion: 1, volumes: {}, diagnostics: [] };
}

function resultsAreClose(baseline: BenchmarkResult, candidate: BenchmarkResult): boolean {
  return (
    relativeDifference(baseline.read.megabytesPerSecond, candidate.read.megabytesPerSecond) <=
      BASELINE_CONFIRMATION_TOLERANCE &&
    relativeDifference(baseline.write.megabytesPerSecond, candidate.write.megabytesPerSecond) <=
      BASELINE_CONFIRMATION_TOLERANCE
  );
}

function relativeDifference(left: number, right: number): number {
  if (left === 0) return right === 0 ? 0 : Number.POSITIVE_INFINITY;
  return Math.abs(right - left) / left;
}

function retainRecentRuns(runs: StoredBenchmarkRun[]): StoredBenchmarkRun[] {
  return runs.slice(0, MAX_SUCCESSFUL_RUNS_PER_VOLUME);
}
