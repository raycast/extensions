/**
 * Type definitions for the diskutil mock layer.
 * See ./README.md for usage.
 */

export type LatencyClass = "fast" | "slow" | "stall";

export interface LatencyRange {
  /** Inclusive lower bound in milliseconds */
  minMs: number;
  /** Inclusive upper bound in milliseconds */
  maxMs: number;
}

export interface LatencyBucket {
  /** Relative weight when picking a class; (fast.weight + slow.weight + stall.weight) is normalized */
  weight: number;
  /** Latency range sampled uniformly when this class is picked */
  range: LatencyRange;
}

export interface LatencyProfile {
  fast: LatencyBucket;
  slow: LatencyBucket;
  stall: LatencyBucket;
}

export interface MockConfig {
  /** Master switch. When false, the mock layer is bypassed entirely. */
  enabled: boolean;
  /**
   * Optional preset name from ./scenarios.ts. When set, the preset's fields
   * override the inline fields below — useful for one-tweak switching.
   */
  scenario: string | null;
  /** Total number of disks (whole + partitions/volumes) to synthesize. */
  diskCount: number;
  /** How many top-level "/dev/diskN" sections to spread diskCount across. */
  sectionCount: number;
  /** Per-disk latency distribution applied to `diskutil info` calls. */
  latency: LatencyProfile;
  /** Latency applied to the single `diskutil list` call. */
  listLatency: LatencyRange;
  /** Latency applied to mount/unmount/eject mock calls. */
  actionLatency: LatencyRange;
  /** Fraction (0..1) of `diskutil info` calls that should reject with an exec error. */
  errorFraction: number;
  /** Seed for the deterministic PRNG. Same seed + config => same outcome. */
  seed: number;
  /** When true, log per-call timing and a summary to the console. */
  logCalls: boolean;
  /**
   * Optional concurrency cap simulating libuv's thread-pool contention. With
   * a cap of N, only N `diskutil info` calls run their setTimeout at a time;
   * the rest queue. This reproduces the production failure mode where many
   * concurrent execs queue against libuv's thread pool and the caller's
   * timeout fires before the call ever starts.
   *
   * Typical values: 4 (Node's default UV_THREADPOOL_SIZE), 8, or 0/omit
   * to disable.
   */
  pool?: number;
}

export interface MockCallLog {
  command: string;
  latencyMs: number;
  latencyClass: LatencyClass | "list" | "action";
  errored: boolean;
}
