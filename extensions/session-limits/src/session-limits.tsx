import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { formatObserved, formatReset, isStale, remainingPercent } from "./core/format";
import { useLimits } from "./use-limits";
import { ProviderActions, providerStatus, quotaColor } from "./ui";

export default function SessionLimits() {
  const { providers, isLoading, refresh, connect, disconnect } = useLimits();
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search providers and limits…">
      <List.EmptyView
        title={
          isLoading && !providers.length
            ? "Loading Limits…"
            : providers.length
              ? "No Matching Limits"
              : "No Providers Enabled"
        }
        description={
          isLoading && !providers.length
            ? "Checking enabled providers."
            : providers.length
              ? "Try another provider or quota name."
              : "Enable a provider or add a custom snapshot file in preferences."
        }
        icon={Icon.Gauge}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
      {providers.map((provider) => {
        const snapshot = provider.snapshot;
        const outdated = provider.status !== "ready" || (snapshot && isStale(snapshot));
        return (
          <List.Section
            key={provider.id}
            title={provider.name}
            subtitle={
              snapshot
                ? `${providerStatus(provider)} · ${formatObserved(snapshot.updatedAt)}`
                : providerStatus(provider)
            }
          >
            {snapshot?.windows.length ? (
              snapshot.windows.map((window) => (
                <List.Item
                  key={window.id}
                  title={window.label}
                  subtitle={formatReset(window.resetAt)}
                  keywords={[provider.name, snapshot.source]}
                  icon={{
                    source: outdated ? Icon.Clock : Icon.Gauge,
                    tintColor: outdated ? undefined : quotaColor(window),
                  }}
                  accessories={[
                    {
                      text: `${remainingPercent(window)}% remaining${outdated ? " · last reading" : ""}`,
                      tooltip: `${window.usedPercent}% used. Source: ${snapshot.source}`,
                    },
                  ]}
                  actions={
                    <ProviderActions
                      provider={provider}
                      windowId={window.id}
                      refresh={refresh}
                      connect={connect}
                      disconnect={disconnect}
                    />
                  }
                />
              ))
            ) : (
              <List.Item
                title={
                  provider.needsConnection
                    ? `Connect ${provider.name}`
                    : provider.status === "waiting"
                      ? "Waiting for Claude Code"
                      : provider.error
                        ? "Usage Unavailable"
                        : "No Quota Windows"
                }
                subtitle={provider.error ?? "The provider returned no limits."}
                icon={provider.needsConnection ? Icon.Link : Icon.QuestionMarkCircle}
                keywords={[provider.name]}
                actions={
                  <ProviderActions
                    provider={provider}
                    refresh={refresh}
                    connect={connect}
                    disconnect={disconnect}
                  />
                }
              />
            )}
          </List.Section>
        );
      })}
    </List>
  );
}
