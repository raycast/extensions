import {
  Action,
  ActionPanel,
  Color,
  Detail,
  environment,
  Icon,
  Keyboard,
  openExtensionPreferences,
} from "@raycast/api";
import { formatObserved, formatReset, isStale, remainingPercent } from "./core/format";
import type { ProviderState, UsageWindow } from "./core/types";
import { useLimits } from "./use-limits";
import { useState } from "react";
import { quotaGauge } from "./core/gauge";

export function quotaColor(window: UsageWindow): Color {
  const remaining = remainingPercent(window);
  return remaining <= 5 ? Color.Red : remaining <= 20 ? Color.Orange : Color.Green;
}

export function providerStatus(provider: ProviderState): string {
  if (provider.status === "setup") return "Not Connected";
  if (provider.status === "waiting") return "Waiting for Claude Code";
  if (provider.status === "error")
    return provider.snapshot ? "Refresh failed · previous reading" : "Unavailable";
  return provider.snapshot && isStale(provider.snapshot) ? "Stale reading" : "Current reading";
}

export function providerDashboard(provider: ProviderState): string | undefined {
  return (
    provider.snapshot?.dashboardUrl ??
    (
      {
        claude: "https://claude.ai/settings/usage",
        codex: "https://chatgpt.com/codex/settings/usage",
      } as Record<string, string>
    )[provider.id]
  );
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+.!|>~-]/g, "\\$&");
}

export function ProviderActions({
  provider,
  refresh,
  connect,
  disconnect,
  detail = false,
  windowId,
  onSelectWindow,
}: {
  provider: ProviderState;
  refresh: () => Promise<void>;
  connect: (id: string) => Promise<void>;
  disconnect: (id: string) => Promise<void>;
  detail?: boolean;
  windowId?: string;
  onSelectWindow?: (id: string) => void;
}) {
  const dashboardUrl = providerDashboard(provider);
  return (
    <ActionPanel>
      {provider.needsConnection && (
        <Action title={`Connect ${provider.name}`} icon={Icon.Link} onAction={() => connect(provider.id)} />
      )}
      {!detail && (
        <Action.Push
          title="Show Details"
          icon={Icon.Sidebar}
          target={<ProviderDetail initialProvider={provider} initialWindowId={windowId} />}
        />
      )}
      {onSelectWindow && (provider.snapshot?.windows.length ?? 0) > 1 && (
        <ActionPanel.Submenu title="Switch Limit" icon={Icon.Gauge}>
          {provider.snapshot?.windows.map((window) => (
            <Action
              key={window.id}
              title={window.label}
              icon={window.id === windowId ? Icon.Checkmark : Icon.Gauge}
              onAction={() => onSelectWindow(window.id)}
            />
          ))}
        </ActionPanel.Submenu>
      )}
      <Action
        title="Refresh Limits"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={refresh}
      />
      {provider.id === "claude" &&
        provider.bridgeConnected &&
        (provider.status === "ready" || provider.status === "waiting") && (
          <Action title="Reconnect Claude Code" icon={Icon.Link} onAction={() => connect(provider.id)} />
        )}
      {provider.id === "claude" && provider.bridgeConnected && (
        <Action title="Disconnect Claude Code" icon={Icon.Logout} onAction={() => disconnect(provider.id)} />
      )}
      {dashboardUrl && <Action.OpenInBrowser title="Open Provider Dashboard" url={dashboardUrl} />}
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </ActionPanel>
  );
}

export function ProviderDetail({
  initialProvider,
  initialWindowId,
}: {
  initialProvider: ProviderState;
  initialWindowId?: string;
}) {
  const [selectedWindowId, setSelectedWindowId] = useState(initialWindowId);
  const { providers, isLoading, refresh, connect, disconnect } = useLimits();
  const currentProvider = providers.find((item) => item.id === initialProvider.id);
  const removed = !isLoading && !currentProvider;
  const provider: ProviderState =
    currentProvider ??
    (isLoading
      ? initialProvider
      : {
          id: initialProvider.id,
          name: initialProvider.name,
          status: "error",
          error: "Provider no longer available. Return to the list to view your enabled providers.",
        });
  const snapshot = provider.snapshot;
  const window = snapshot?.windows.find((item) => item.id === selectedWindowId) ?? snapshot?.windows[0];
  const outdated = provider.status !== "ready" || !!(snapshot && isStale(snapshot));
  const measured = window && Number.isFinite(window.usedPercent);
  const markdown = measured
    ? [
        `![${remainingPercent(window)}% remaining${outdated ? "; previous reading" : ""}](${quotaGauge(remainingPercent(window), environment.appearance, outdated)})`,
        outdated
          ? "**Previous reading** · Refresh for current limits."
          : escapeMarkdown(formatReset(window.resetAt)),
        provider.error ? escapeMarkdown(provider.error) : "",
      ]
        .filter(Boolean)
        .join("\n\n")
    : [
        `# ${escapeMarkdown(provider.name)}`,
        `**${providerStatus(provider)}**`,
        provider.error ? escapeMarkdown(provider.error) : "",
        !snapshot && !removed && provider.needsConnection
          ? "Connect Claude Code to add a local status-line integration. It saves quota readings while Claude Code is active and preserves your existing status line. Requires Claude Code 2.1.251 or later."
          : "",
      ]
        .filter(Boolean)
        .join("\n\n");
  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={window ? `${provider.name} · ${window.label}` : provider.name}
      markdown={markdown}
      metadata={
        snapshot ? (
          <Detail.Metadata>
            {window?.resetAt && Number.isFinite(Date.parse(window.resetAt)) && (
              <Detail.Metadata.Label
                title="Reset Time"
                text={new Date(window.resetAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "long",
                })}
              />
            )}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Status" text={providerStatus(provider)} />
            <Detail.Metadata.Label title="Observed" text={formatObserved(snapshot.updatedAt)} />
            <Detail.Metadata.Label title="Source" text={snapshot.source} />
            {snapshot.plan && <Detail.Metadata.Label title="Plan" text={snapshot.plan} />}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ProviderActions
          provider={provider}
          refresh={refresh}
          connect={connect}
          disconnect={disconnect}
          detail
          windowId={window?.id}
          onSelectWindow={setSelectedWindowId}
        />
      }
    />
  );
}
