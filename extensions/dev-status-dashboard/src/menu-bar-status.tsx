import {
  Color,
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  openCommandPreferences,
} from "@raycast/api";
import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import { clearCache } from "./lib/cache";
import { CONFIG_KEY, defaultConfig, enabledStates, normalizeConfig, type DashboardConfig } from "./lib/config";
import { loadAll, type ServiceState } from "./lib/load";
import { hasProblem, indicatorColor, severityRank, statusIcon } from "./lib/status-format";
import type { Indicator } from "./lib/providers/types";

type DisplayMode = "icon" | "count" | "name" | "overall";

function worstIndicator(states: ServiceState[]): Indicator {
  let worst: Indicator = "none";
  for (const { status } of states) {
    const indicator = status?.indicator ?? "none";
    if (severityRank(indicator) > severityRank(worst)) worst = indicator;
  }
  return worst;
}

function menuBarTitle(mode: DisplayMode, states: ServiceState[], problems: ServiceState[]): string | undefined {
  switch (mode) {
    case "icon":
      return undefined;
    case "count":
      return problems.length > 0 ? String(problems.length) : undefined;
    case "name":
      return problems[0]?.service.name;
    case "overall": {
      // Count anything that isn't a confirmed problem as operational, so services that are still
      // loading or momentarily unreachable don't drop the number and flash a false alarm.
      const operational = states.length - problems.length;
      return `${operational}/${states.length}`;
    }
  }
}

export default function MenuBarStatus() {
  const { displayMode } = getPreferenceValues<Preferences.MenuBarStatus>();
  const { value: storedConfig } = useLocalStorage<DashboardConfig>(CONFIG_KEY, defaultConfig());
  const config = normalizeConfig(storedConfig);

  const { data, isLoading, revalidate } = useCachedPromise(loadAll, [config.enabledIds], {
    initialData: [] as ServiceState[],
  });
  const favorites = new Set(config.favorites);
  const favoritesFirst = (a: ServiceState, b: ServiceState) =>
    Number(favorites.has(b.service.id)) - Number(favorites.has(a.service.id));
  const states = enabledStates(data ?? [], config);

  const problems = states.filter((state) => state.status && hasProblem(state.status.indicator)).sort(favoritesFirst);
  const healthy = states.filter((state) => !state.status || !hasProblem(state.status.indicator)).sort(favoritesFirst);
  const worst = worstIndicator(states);

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={statusIcon(worst)}
      title={menuBarTitle(displayMode as DisplayMode, states, problems)}
      tooltip="Dev Status"
    >
      {problems.length > 0 && (
        <MenuBarExtra.Section title={`Active Incidents (${problems.length})`}>
          {problems.map(({ service, status }) => (
            <MenuBarExtra.Item
              key={service.id}
              icon={{ source: Icon.CircleFilled, tintColor: indicatorColor(status?.indicator ?? "unknown") }}
              title={service.name}
              subtitle={status?.activeIncidents[0]?.name ?? status?.description}
              onAction={() => open(service.statusUrl)}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      {states.length === 0 && (
        <MenuBarExtra.Item
          title="No services on your dashboard"
          icon={Icon.Plus}
          onAction={() => launchCommand({ name: "dashboard", type: LaunchType.UserInitiated })}
        />
      )}

      <MenuBarExtra.Section title={problems.length > 0 ? "Operational" : undefined}>
        {healthy.map(({ service, status, error }) => (
          <MenuBarExtra.Item
            key={service.id}
            icon={{
              source: Icon.CircleFilled,
              tintColor: error ? Color.SecondaryText : indicatorColor(status?.indicator ?? "unknown"),
            }}
            title={service.name}
            subtitle={error ? "Unreachable" : undefined}
            onAction={() => open(service.statusUrl)}
          />
        ))}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          onAction={async () => {
            await clearCache();
            revalidate();
          }}
        />
        <MenuBarExtra.Item
          title="Open Dashboard"
          icon={Icon.AppWindowList}
          onAction={() => launchCommand({ name: "dashboard", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item title="Settings…" icon={Icon.Gear} onAction={openCommandPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
