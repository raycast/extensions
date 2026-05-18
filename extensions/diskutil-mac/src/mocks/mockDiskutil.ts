/**
 * Single entry point for the mock layer.
 *
 * Integration is one line in `execDiskCommand` — see ../utils/diskUtils.tsx.
 * Everything else (config, fixtures, RNG, topology) lives in this folder.
 */

import rawConfig from "./mockConfig.json";
import rawOverride from "./mockOverride.json";
import { SCENARIOS, resolveScenarioRef } from "./scenarios";
import { buildPlist, buildPlainText, type SynthDisk } from "./fixtures";
import { buildTopology, renderDiskutilList, type SynthTopology } from "./topology";
import { rngFor, randInt, weightedPick } from "./rng";
import type { LatencyClass, LatencyRange, MockCallLog, MockConfig } from "./types";

const config: MockConfig = resolveConfig();

let topology: SynthTopology | null = null;
const callLog: MockCallLog[] = [];

export function isMockEnabled(): boolean {
  return config.enabled;
}

/**
 * Mock replacement for `execDiskCommand`. Returns the same shape (resolved
 * string for success, rejected Promise for failure) as the real one.
 */
export async function mockExec(command: string): Promise<string> {
  const world = ensureTopology();

  // diskutil list
  if (/\bdiskutil\s+list\b/.test(command)) {
    return runWithLatency(command, "list", sampleListLatency(), false, () => renderDiskutilList(world));
  }

  // diskutil info -plist <id>
  const plistMatch = command.match(/\bdiskutil\s+info\s+-plist\s+(\S+)/);
  if (plistMatch) {
    return runForDisk(world, command, plistMatch[1], (d) => buildPlist(d));
  }

  // diskutil info <id>
  const infoMatch = command.match(/\bdiskutil\s+info\s+(\S+)/);
  if (infoMatch) {
    return runForDisk(world, command, infoMatch[1], (d) => buildPlainText(d));
  }

  // mount / unmount / eject — succeed quickly, also flip mount state so
  // a subsequent Refresh shows the new value.
  const mountMatch = command.match(/\bdiskutil\s+(mount|unmount|eject)\s+(?:force\s+)?(\S+)/);
  if (mountMatch) {
    const verb = mountMatch[1];
    const id = mountMatch[2];
    return runWithLatency(command, "action", sampleActionLatency(), false, () => {
      const disk = world.byIdentifier.get(id);
      if (disk) {
        if (verb === "mount") {
          disk.mounted = true;
          disk.mountPoint = `/Volumes/${disk.name}`;
        } else {
          disk.mounted = false;
          disk.mountPoint = "";
        }
      }
      return `${verb === "eject" ? "Disk" : "Volume"} ${id} ${verb}ed`;
    });
  }

  // Unknown command — don't blow up, just return empty so the host code
  // sees the same behavior as a real exec that produced no output.
  return runWithLatency(command, "action", sampleActionLatency(), false, () => "");
}

/** Return a snapshot of recorded calls (useful for debugging / tests). */
export function getCallLog(): MockCallLog[] {
  return callLog.slice();
}

/** Clear the call log. Call between scenarios when running multiple in one session. */
export function resetCallLog(): void {
  callLog.length = 0;
}

// ---------- internals ----------

function ensureTopology(): SynthTopology {
  if (!topology) {
    topology = buildTopology(config.diskCount, config.sectionCount, config.seed);
    if (config.logCalls) {
      const totalDisks = topology.sections.reduce((sum, s) => sum + s.disks.length, 0);
      console.log(
        `[mockDiskutil] topology ready: ${topology.sections.length} sections, ${totalDisks} disks ` +
          `(scenario=${config.scenario ?? "(inline)"}, seed=${config.seed})`,
      );
    }
  }
  return topology;
}

function runForDisk(
  world: SynthTopology,
  command: string,
  identifier: string,
  render: (d: SynthDisk) => string,
): Promise<string> {
  const disk = world.byIdentifier.get(identifier);
  if (!disk) {
    // Unknown identifier — mimic diskutil's behavior with a rejection.
    return runWithLatency(command, "fast", { minMs: 5, maxMs: 15 }, true, () => "").catch(() => {
      throw new Error(`Could not find disk: ${identifier}`);
    });
  }
  const rng = rngFor(config.seed, identifier);
  const cls = pickLatencyClass(rng);
  const range = config.latency[cls].range;
  const shouldError = rng() < config.errorFraction;
  return runWithLatency(command, cls, range, shouldError, () => render(disk));
}

function pickLatencyClass(rng: () => number): LatencyClass {
  const { fast, slow, stall } = config.latency;
  return weightedPick(rng, [
    { value: "fast", weight: fast.weight },
    { value: "slow", weight: slow.weight },
    { value: "stall", weight: stall.weight },
  ]);
}

function sampleListLatency(): LatencyRange {
  return config.listLatency;
}

function sampleActionLatency(): LatencyRange {
  return config.actionLatency;
}

/**
 * Simulated libuv-style concurrency cap. Only `diskutil info` calls flow
 * through this — the single `diskutil list` and rare action calls don't,
 * since reality doesn't queue them against the same pool either.
 */
let poolInFlight = 0;
const poolWaiters: (() => void)[] = [];

async function acquirePoolSlot(): Promise<void> {
  const cap = config.pool ?? 0;
  if (cap <= 0) return;
  if (poolInFlight < cap) {
    poolInFlight++;
    return;
  }
  await new Promise<void>((resolve) => poolWaiters.push(resolve));
  poolInFlight++;
}

function releasePoolSlot(): void {
  if ((config.pool ?? 0) <= 0) return;
  poolInFlight--;
  const next = poolWaiters.shift();
  if (next) next();
}

async function runWithLatency(
  command: string,
  cls: LatencyClass | "list" | "action",
  range: LatencyRange,
  shouldError: boolean,
  produce: () => string,
): Promise<string> {
  const latency = randInt(Math.random, range.minMs, range.maxMs);
  // Only info calls go through the pool — list/action don't contend.
  const usesPool = cls !== "list" && cls !== "action";
  if (usesPool) await acquirePoolSlot();

  try {
    return await new Promise<string>((resolve, reject) => {
      setTimeout(() => {
        callLog.push({ command, latencyMs: latency, latencyClass: cls, errored: shouldError });
        if (config.logCalls) {
          console.log(`[mockDiskutil] ${cls.padEnd(6)} ${latency}ms${shouldError ? " ERR" : ""}  ${command}`);
        }
        if (shouldError) {
          reject(new Error(`MOCK: simulated exec failure for: ${command}`));
        } else {
          resolve(produce());
        }
      }, latency);
    });
  } finally {
    if (usesPool) releasePoolSlot();
  }
}

function resolveConfig(): MockConfig {
  // Precedence (lowest to highest):
  //   1. mockConfig.json   — committed baseline
  //   2. mockOverride.json — written by scripts/apply-mock.sh
  //   3. env vars          — MOCK / MOCK_SCENARIO / MOCK_LOG (CI / harnesses)
  const base = { ...(rawConfig as object), ...(rawOverride as object) } as MockConfig;

  const envMock = (process.env.MOCK ?? "").trim();
  const envScenario = (process.env.MOCK_SCENARIO ?? "").trim();
  const envLog = (process.env.MOCK_LOG ?? "").trim();

  let enabled = base.enabled;
  let scenario: string | null = base.scenario;

  if (envMock) {
    const lower = envMock.toLowerCase();
    if (lower === "0" || lower === "false" || lower === "off" || lower === "no") {
      enabled = false;
    } else {
      enabled = true;
      // If MOCK is a scenario ref, use it; otherwise ("on"/"true"/"1") keep base.scenario.
      const resolved = resolveScenarioRef(envMock);
      if (resolved) scenario = resolved;
    }
  }

  if (envScenario) {
    const resolved = resolveScenarioRef(envScenario);
    if (resolved) {
      enabled = true;
      scenario = resolved;
    } else {
      console.warn(
        `[mockDiskutil] MOCK_SCENARIO="${envScenario}" not recognized. ` +
          `Known: ${Object.keys(SCENARIOS).join(", ")}.`,
      );
    }
  }

  const logCalls = envLog ? envLog === "1" || envLog.toLowerCase() === "true" : base.logCalls;

  // Normalize: scenario may arrive as a number-string ("4") from the override
  // file or env var. Resolve to a canonical name before SCENARIOS lookup.
  const canonical = scenario ? resolveScenarioRef(scenario) : null;
  const merged: MockConfig = { ...base, enabled, scenario: canonical, logCalls };

  if (!canonical) return merged;
  const preset = SCENARIOS[canonical];
  if (!preset) {
    console.warn(
      `[mockDiskutil] unknown scenario "${scenario}". Known: ${Object.keys(SCENARIOS).join(
        ", ",
      )}. Falling back to inline config.`,
    );
    return merged;
  }
  return { ...merged, ...preset };
}
