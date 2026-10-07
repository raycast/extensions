import { environment, getPreferenceValues } from "@raycast/api";
import { join } from "node:path";
import {
  claudeBridgePaths,
  connectClaudeBridge,
  disconnectClaudeBridge,
  readBridgeDocument,
} from "./claude-statusline-bridge";
import { isoDate, percent, record } from "./claude-statusline-parsing";
import type { ProviderUsageState, UsageWindow } from "./usage";

const staleAfterMilliseconds = 5 * 60 * 1_000;

function bridgeOptions() {
  const preferences = getPreferenceValues<{ claudeHome?: string }>();
  return {
    claudeConfigDir: preferences.claudeHome,
    bridgeDirectory: join(environment.supportPath, "claude-statusline"),
  };
}

export async function connectClaudeStatusLine(): Promise<void> {
  await connectClaudeBridge({
    ...bridgeOptions(),
    assetPath: join(environment.assetsPath, "claude-statusline.cjs"),
    nodePath: process.execPath,
  });
}

export async function disconnectClaudeStatusLine(): Promise<void> {
  await disconnectClaudeBridge(bridgeOptions());
}

// Undefined means explicitly unconnected. An unreadable or conflicting connection
// remains a bridge state so refreshing never silently starts another Claude process.
export async function readClaudeStatusLineUsage(): Promise<ProviderUsageState | undefined> {
  const state: ProviderUsageState = {
    provider: "claude",
    name: "Claude Code",
    bridgeConnected: true,
    source: "unavailable",
    lastAttemptAt: Date.now(),
  };
  try {
    const paths = claudeBridgePaths(bridgeOptions());
    const connection = await readBridgeDocument(paths.state);
    if (!connection || connection.value.active === false) return undefined;
    const settings = await readBridgeDocument(paths.settings);
    if (JSON.stringify(settings?.value.statusLine) !== JSON.stringify(connection.value.installed)) {
      return { ...state, error: "Your Claude status line changed. Disconnect and reconnect to resume updates." };
    }
    const snapshot = await readBridgeDocument(paths.snapshot);
    const updatedAt = isoDate(snapshot?.value.updatedAt);
    const fetchedAt = updatedAt ? Date.parse(updatedAt) : undefined;
    const limits = record(snapshot?.value.rate_limits);
    const now = Date.now();
    const windows: UsageWindow[] = [];
    for (const [id, title, durationMinutes] of [
      ["five_hour", "5-hour limit", 300],
      ["seven_day", "Weekly limit", 10_080],
    ] as const) {
      const limit = record(limits[id]);
      const usedPercent = percent(limit.used_percentage);
      const reset = isoDate(limit.resets_at, true);
      const resetsAt = reset ? Date.parse(reset) : undefined;
      if (usedPercent !== undefined && resetsAt !== undefined && resetsAt > now) {
        windows.push({
          id: `claude:${id}`,
          title,
          usedPercent,
          remainingPercent: 100 - usedPercent,
          resetsAt,
          durationMinutes,
        });
      }
    }
    if (!fetchedAt || fetchedAt > now + 60_000 || !windows.length) {
      return {
        ...state,
        error:
          "Connected. Send a message in Claude Code, then refresh. Requires Claude Code 2.1.251 or later with supported subscription limits.",
      };
    }
    const stale = now - fetchedAt > staleAfterMilliseconds;
    return {
      ...state,
      source: stale ? "stale" : "live",
      data: { provider: "claude", fetchedAt, windows },
      ...(stale
        ? { error: "Last observed usage is over 5 minutes old. Send a message in Claude Code to update it." }
        : {}),
    };
  } catch {
    return {
      ...state,
      error: "Could not safely read the Claude status-line connection. Check the Claude data folder and settings.json.",
    };
  }
}
