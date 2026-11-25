import { Cache, showToast, Toast } from "@raycast/api";
import fs from "node:fs";
import { FM_PATH } from "../lib/fm/constants";
import { probeFm } from "../lib/fm/process";
import {
  evaluatePreflight,
  isPreflightCacheFresh,
  type ModelAvailability,
  parseModelAvailability,
  type PreflightProbes,
  type PreflightResult,
} from "../lib/preflight";
import { withTimeout } from "../lib/with-timeout";
import { modelAvailability } from "swift:../../swift";
import { launchLocalAiCommand } from "./launch";

const CACHE_KEY = "preflight.v1";
const PROBE_TIMEOUT_MS = 10_000;
const cache = new Cache();

export async function getPreflight(options: { force?: boolean } = {}): Promise<PreflightResult> {
  if (!options.force && isCachedFresh()) return evaluatePreflight(PASSING_PROBES);

  const { result, determined } = await runProbes();
  if (result.ok && determined) cache.set(CACHE_KEY, JSON.stringify({ checkedAt: Date.now() }));
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
  return launchLocalAiCommand({ name: "check-setup", title: "Check Setup" });
}

const PASSING_PROBES: PreflightProbes = {
  binaryExists: true,
  license: { exitCode: 0, stdout: "Agreed", stderr: "" },
  available: { status: "available" },
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

async function runProbes(): Promise<{ result: PreflightResult; determined: boolean }> {
  if (!binaryExists()) return { result: evaluatePreflight({ binaryExists: false }), determined: true };
  const license = await probeFm(["license", "--status"], PROBE_TIMEOUT_MS);
  const afterLicense = evaluatePreflight({ binaryExists: true, license });
  if (!afterLicense.ok && afterLicense.firstFailure === "license") return { result: afterLicense, determined: true };
  const available = await probeModelAvailability();
  return {
    result: evaluatePreflight({ binaryExists: true, license, available }),
    determined: available.status !== "undetermined",
  };
}

async function probeModelAvailability(): Promise<ModelAvailability> {
  try {
    return parseModelAvailability(await withTimeout(modelAvailability(), PROBE_TIMEOUT_MS));
  } catch {
    return { status: "undetermined" };
  }
}

function binaryExists(): boolean {
  try {
    fs.accessSync(FM_PATH, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}
