import { Cache } from "@raycast/api";
import { COST_TIMEOUT_MS, USAGE_TIMEOUT_MS } from "./constants";
import { runCliJson } from "./cli";
import { activeCostProviders, parseCostCli } from "./cost";
import { readSnapshot } from "./snapshot";
import { ProviderCost, ProviderUsage } from "./types";
import { mergeUsage, parseUsageCli } from "./usage";

const cache = new Cache();
const CLI_USAGE_KEY = "cli-usage";

function cachedCliUsage(): ProviderUsage[] {
  const raw = cache.get(CLI_USAGE_KEY);
  if (!raw) return [];
  try {
    return parseUsageCli(JSON.parse(raw));
  } catch {
    cache.remove(CLI_USAGE_KEY);
    return [];
  }
}

/** Instant: the app's widget snapshot merged with the last manual refresh. */
export async function loadUsage(): Promise<ProviderUsage[]> {
  return mergeUsage(await readSnapshot(), cachedCliUsage());
}

/** Slow (~30s): asks every enabled provider for fresh numbers through the CLI. */
export async function refreshUsage(): Promise<ProviderUsage[]> {
  const json = await runCliJson(["usage", "--format", "json"], USAGE_TIMEOUT_MS);
  const fresh = parseUsageCli(json);
  cache.set(CLI_USAGE_KEY, JSON.stringify(json));
  let app: ProviderUsage[] = [];
  try {
    app = await readSnapshot();
  } catch {
    // The CLI works without the menu bar app running; show its data alone.
  }
  return mergeUsage(app, fresh);
}

export async function loadCost(): Promise<ProviderCost[]> {
  const json = await runCliJson(["cost", "--format", "json"], COST_TIMEOUT_MS);
  const costs = parseCostCli(json);
  const active = activeCostProviders(costs);
  if (active.length === 0) {
    const failure = costs.find((entry) => entry.error);
    if (failure?.error) throw new Error(failure.error);
  }
  return active;
}
