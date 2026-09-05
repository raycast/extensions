import type { BenchmarkRunConfiguration } from "./engine";

const MEBIBYTE = 1_048_576;

export const DEFAULT_MAX_TEST_SIZE_MIB = 256;
export const DEFAULT_TARGET_DURATION_SECONDS = 10;
export const MINIMUM_MAX_TEST_SIZE_MIB = 256;
export const MAXIMUM_MAX_TEST_SIZE_MIB = 25_600;
export const MINIMUM_TARGET_DURATION_SECONDS = 1;
export const MAXIMUM_TARGET_DURATION_SECONDS = 60;

export const BENCHMARK_DATA_SIZE_OPTIONS = [
  { title: "256 MiB", value: "256" },
  { title: "512 MiB", value: "512" },
  { title: "1 GiB", value: "1024" },
  { title: "2 GiB", value: "2048" },
  { title: "5 GiB", value: "5120" },
  { title: "10 GiB", value: "10240" },
  { title: "25 GiB", value: "25600" },
] as const;

export const BENCHMARK_DURATION_OPTIONS = [
  { title: "3 seconds", value: "3" },
  { title: "5 seconds", value: "5" },
  { title: "10 seconds", value: "10" },
  { title: "25 seconds", value: "25" },
  { title: "45 seconds", value: "45" },
  { title: "1 minute", value: "60" },
] as const;

export interface BenchmarkTarget {
  maxBytes: number;
  targetDurationSeconds: number;
}

export interface BenchmarkTargetValues {
  maxTestSizeMiB?: string;
  targetDurationSeconds?: string;
}

export function parseBenchmarkTarget(values: BenchmarkTargetValues): BenchmarkTarget {
  const sizeMiB = boundedInteger(
    values.maxTestSizeMiB,
    DEFAULT_MAX_TEST_SIZE_MIB,
    MINIMUM_MAX_TEST_SIZE_MIB,
    MAXIMUM_MAX_TEST_SIZE_MIB,
  );
  const targetDurationSeconds = boundedInteger(
    values.targetDurationSeconds,
    DEFAULT_TARGET_DURATION_SECONDS,
    MINIMUM_TARGET_DURATION_SECONDS,
    MAXIMUM_TARGET_DURATION_SECONDS,
  );

  return { maxBytes: sizeMiB * MEBIBYTE, targetDurationSeconds };
}

export function benchmarkTargetValues(target: BenchmarkTarget): Required<BenchmarkTargetValues> {
  return {
    maxTestSizeMiB: String(Math.round(target.maxBytes / MEBIBYTE)),
    targetDurationSeconds: String(target.targetDurationSeconds),
  };
}

export function benchmarkTargetFromConfiguration(
  configuration: Pick<BenchmarkRunConfiguration, "maxBytes" | "targetDurationSeconds">,
): BenchmarkTarget {
  return {
    maxBytes: configuration.maxBytes,
    targetDurationSeconds: configuration.targetDurationSeconds,
  };
}

export function benchmarkRunConfiguration(directory: string, target: BenchmarkTarget): BenchmarkRunConfiguration {
  return {
    directory,
    maxBytes: target.maxBytes,
    warmupBytes: Math.min(32 * MEBIBYTE, Math.floor(target.maxBytes / 8)),
    targetDurationSeconds: target.targetDurationSeconds,
    chunkSizeBytes: 4 * MEBIBYTE,
  };
}

function boundedInteger(value: string | undefined, fallback: number, minimum: number, maximum: number): number {
  const parsed = value?.trim() ? Number(value) : fallback;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.round(parsed)));
}
