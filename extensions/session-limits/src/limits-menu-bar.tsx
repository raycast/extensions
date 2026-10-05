import { Icon, launchCommand, LaunchType, MenuBarExtra, open, openExtensionPreferences } from "@raycast/api";
import { formatObserved, formatReset, isStale, remainingPercent } from "./core/format";
import { useLimits } from "./use-limits";
import { providerDashboard, providerStatus } from "./ui";

export default function LimitsMenuBar() {
  const { providers, isLoading, refresh } = useLimits();
  const remaining = providers.flatMap((provider) =>
    provider.status === "ready" && provider.snapshot && !isStale(provider.snapshot)
      ? provider.snapshot.windows.map(remainingPercent)
      : [],
  );
  const title = remaining.length ? `Limits ${Math.min(...remaining)}%` : "Limits —";
  return (
    <MenuBarExtra
      icon={Icon.Gauge}
      title={title}
      tooltip="Lowest remaining quota across fresh provider readings"
      isLoading={isLoading}
    >
      {providers.map((provider) => (
        <MenuBarExtra.Section key={provider.id} title={provider.name}>
          <MenuBarExtra.Item
            title={providerStatus(provider)}
            onAction={
              provider.needsConnection
                ? () => launchCommand({ name: "session-limits", type: LaunchType.UserInitiated })
                : undefined
            }
          />
          {provider.snapshot?.windows.map((window) => (
            <MenuBarExtra.Item
              key={window.id}
              title={`${window.label}: ${remainingPercent(window)}% remaining`}
              subtitle={formatReset(window.resetAt)}
            />
          ))}
          {provider.snapshot && (
            <MenuBarExtra.Item
              title={formatObserved(provider.snapshot.updatedAt)}
              subtitle={`Source: ${provider.snapshot.source}`}
            />
          )}
          {provider.error && <MenuBarExtra.Item title={provider.error} icon={Icon.ExclamationMark} />}
          {providerDashboard(provider) && (
            <MenuBarExtra.Item
              title={`Open ${provider.name} Dashboard`}
              onAction={() => open(providerDashboard(provider)!)}
            />
          )}
        </MenuBarExtra.Section>
      ))}
      {!providers.length && (
        <MenuBarExtra.Item title={isLoading ? "Loading limits…" : "No providers enabled"} />
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Show Session Limits"
          icon={Icon.List}
          onAction={() => launchCommand({ name: "session-limits", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item title="Refresh Limits" icon={Icon.ArrowClockwise} onAction={refresh} />
        <MenuBarExtra.Item title="Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
