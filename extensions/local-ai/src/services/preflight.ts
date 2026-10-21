import { Cache, LaunchType, launchCommand, showToast, Toast } from "@raycast/api";
import fs from "node:fs";
import { FM_PATH } from "../lib/fm/constants";
import { probeFm } from "../lib/fm/process";
import { evaluatePreflight, isPreflightCacheFresh, type PreflightResult } from "../lib/preflight";

const CACHE_KEY = "preflight.v1";
const PROBE_TIMEOUT_MS = 10_000;
const cache = new Cache();

export async function getPreflight(options: { force?: boolean } = {}): Promise<PreflightResult> {
  if (!options.force && isCachedFresh()) return evaluatePreflight(PASSING_PROBES);

  const result = await runProbes();
  if (result.ok) cache.set(CACHE_KEY, JSON.stringify({ checkedAt: Date.now() }));
  else invalidatePreflight();
  return result;
}

export function invalidatePreflight(): void {
  cache.remove(CACHE_KEY);
}

export async function ensureReady(): Promise<boolean> {
  const result = await getPreflight();
  if (result.ok) return true;

  await showToast({
    style: Toast.Style.Failure,
    title: "Local AI is not ready",
    message: result.checks.find((check) => check.id === result.firstFailure)?.message,
    primaryAction: {
      title: "Check Setup",
      onAction: () => launchCheckSetup(),
    },
  });
  return false;
}

export function launchCheckSetup(): Promise<void> {
  return launchCommand({ name: "check-setup", type: LaunchType.UserInitiated });
}

const PASSING_PROBES = {
  binaryExists: true,
  license: { exitCode: 0, stdout: "Agreed", stderr: "" },
  available: { exitCode: 0, stdout: "System model available", stderr: "" },
};

function isCachedFresh(): boolean {
  const raw = cache.get(CACHE_KEY);
  if (raw === undefined) return false;
  try {
    const { checkedAt } = JSON.parse(raw) as { checkedAt?: unknown };
    return typeof checkedAt === "number" && isPreflightCacheFresh(checkedAt, Date.now());
  } catch {
    return false;
  }
}

async function runProbes(): Promise<PreflightResult> {
  if (!binaryExists()) return evaluatePreflight({ binaryExists: false });
  const license = await probeFm(["license", "--status"], PROBE_TIMEOUT_MS);
  const afterLicense = evaluatePreflight({ binaryExists: true, license });
  if (!afterLicense.ok && afterLicense.firstFailure === "license") return afterLicense;
  const available = await probeFm(["available"], PROBE_TIMEOUT_MS);
  return evaluatePreflight({ binaryExists: true, license, available });
}

function binaryExists(): boolean {
  try {
    fs.accessSync(FM_PATH, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}
