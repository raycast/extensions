import { getPreferenceValues } from "@raycast/api";
import os from "node:os";
import path from "node:path";
import { BenchmarkRunConfiguration } from "../benchmark/engine";
import { ensureBenchmarkDirectory } from "../benchmark/destination";
import { BenchmarkTarget, benchmarkRunConfiguration, parseBenchmarkTarget } from "../benchmark/targets";
import { getRememberedDestinationRoot } from "./storage";

export async function resolveDestinationRoot(override?: string): Promise<string> {
  if (override) return override;
  const remembered = await getRememberedDestinationRoot();
  if (remembered) return remembered;
  const preferences = getPreferenceValues<Preferences>();
  return preferences.benchmarkDirectory || path.join(os.homedir(), "Library", "Caches");
}

export async function resolveRunConfiguration(
  destinationRoot?: string,
  targetOverride?: BenchmarkTarget,
): Promise<BenchmarkRunConfiguration> {
  const target = targetOverride ?? resolveBenchmarkPreferenceSummary();
  const root = await resolveDestinationRoot(destinationRoot);
  const directory = await ensureBenchmarkDirectory(root);

  return benchmarkRunConfiguration(directory, target);
}

export function resolveBenchmarkPreferenceSummary(): BenchmarkTarget {
  const preferences = getPreferenceValues<Preferences>();
  return parseBenchmarkTarget(preferences);
}
