import type { ProviderOptions, ProviderSnapshot, UsageWindow } from "../core/types";
import { BridgeConflict, BridgeWaiting, ConnectionRequired } from "../core/errors";
import { claudeBridgePaths, readBridgeDocument } from "./claude-bridge";
import { isoDate, percent, record } from "./parsing";

export async function fetchClaude(options: ProviderOptions): Promise<ProviderSnapshot> {
  if (!options.claudeBridgeDirectory) throw new ConnectionRequired();
  const paths = claudeBridgePaths({
    claudeConfigDir: options.claudeConfigDir,
    bridgeDirectory: options.claudeBridgeDirectory,
  });
  const state = await readBridgeDocument(paths.state);
  if (!state || state.value.active === false) throw new ConnectionRequired();
  const settings = await readBridgeDocument(paths.settings);
  if (JSON.stringify(settings?.value.statusLine) !== JSON.stringify(state.value.installed))
    throw new BridgeConflict(
      "Your Claude status line changed. Disconnect and reconnect to enable usage updates.",
    );
  const saved = await readBridgeDocument(paths.snapshot);
  const updatedAt = isoDate(saved?.value.updatedAt);
  const limits = record(saved?.value.rate_limits);
  const windows: UsageWindow[] = [];
  for (const [id, label, minutes] of [
    ["five_hour", "5-hour", 300],
    ["seven_day", "Weekly", 10080],
  ] as const) {
    const limit = record(limits[id]);
    const usedPercent = percent(limit.used_percentage);
    const resetAt = isoDate(limit.resets_at, true);
    if (usedPercent !== undefined && resetAt && Date.parse(resetAt) > Date.now())
      windows.push({ id, label, usedPercent, resetAt, windowMinutes: minutes });
  }
  if (!updatedAt || !windows.length)
    throw new BridgeWaiting(
      "Connected. Send a message in Claude Code, then refresh. Requires Claude Code 2.1.251 or later and a supported subscription.",
    );
  return {
    id: "claude",
    name: "Claude Code",
    windows,
    updatedAt,
    source: "Claude Code status line",
    dashboardUrl: "https://claude.ai/settings/usage",
  };
}
