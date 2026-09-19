import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import { AddServiceView } from "./components/add-service";
import { IncidentDetail } from "./components/incident-detail";
import {
  addService,
  CONFIG_KEY,
  defaultConfig,
  enabledStates,
  filterStates,
  moveService,
  normalizeConfig,
  removeService,
  sortStates,
  toggleFavorite,
  type DashboardConfig,
  type FilterMode,
  type SortMode,
} from "./lib/config";
import { clearCache } from "./lib/cache";
import { loadAll, type ServiceState } from "./lib/load";
import { hasProblem, statusIcon } from "./lib/status-format";

const SORT_LABELS: Record<SortMode, string> = {
  custom: "Custom",
  name: "Name",
  status: "Status",
  incident: "Active Incidents",
};

function accessoryText({ status, error }: ServiceState): string {
  if (error) return "Unreachable";
  if (!status) return "…";
  const incidentCount = status.activeIncidents.length;
  if (incidentCount > 0) return `${incidentCount} incident${incidentCount > 1 ? "s" : ""} · ${status.description}`;
  return status.description;
}

export default function Dashboard() {
  const {
    value: storedConfig,
    setValue: setConfig,
    isLoading: configLoading,
  } = useLocalStorage<DashboardConfig>(CONFIG_KEY, defaultConfig());

  const config = normalizeConfig(storedConfig);
  const update = (next: DashboardConfig) => setConfig(next);

  const { data, isLoading, revalidate } = useCachedPromise(loadAll, [config.enabledIds], {
    initialData: [] as ServiceState[],
  });

  const visible = filterStates(sortStates(enabledStates(data ?? [], config), config), config);

  return (
    <List
      isLoading={isLoading || configLoading}
      searchBarPlaceholder="Filter services"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter"
          value={config.filter}
          onChange={(value) => update({ ...config, filter: value as FilterMode })}
        >
          <List.Dropdown.Item title="All" value="all" icon={Icon.Circle} />
          <List.Dropdown.Item title="Incidents Only" value="incidents" icon={Icon.ExclamationMark} />
          <List.Dropdown.Item title="Favorites Only" value="favorites" icon={Icon.Star} />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={config.filter === "favorites" ? Icon.Star : Icon.CheckCircle}
        title={config.filter === "incidents" ? "No active incidents" : "Nothing to show"}
        description={
          config.filter === "favorites"
            ? "Favorite a service to see it here."
            : "Add a service from the actions menu (⌘N)."
        }
      />
      {visible.map((state) => {
        const favorite = config.favorites.includes(state.service.id);
        return (
          <List.Item
            key={state.service.id}
            icon={statusIcon(state.status?.indicator ?? "unknown")}
            title={state.service.name}
            subtitle={state.service.category}
            accessories={[
              ...(favorite ? [{ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Favorite" }] : []),
              {
                text: accessoryText(state),
                icon: state.status && hasProblem(state.status.indicator) ? Icon.ExclamationMark : undefined,
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push
                    title="Show Details"
                    icon={Icon.Sidebar}
                    target={<IncidentDetail service={state.service} initialStatus={state.status} />}
                  />
                  <Action.OpenInBrowser title="Open Status Page" url={state.service.statusUrl} />
                  <Action
                    title={favorite ? "Remove Favorite" : "Add Favorite"}
                    icon={favorite ? Icon.StarDisabled : Icon.Star}
                    shortcut={Keyboard.Shortcut.Common.Pin}
                    onAction={() => update(toggleFavorite(config, state.service.id))}
                  />
                  <ActionPanel.Submenu title="Sort by" icon={Icon.BarChart}>
                    {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
                      <Action
                        key={mode}
                        title={SORT_LABELS[mode]}
                        icon={config.sort === mode ? Icon.CheckCircle : Icon.Circle}
                        onAction={() => update({ ...config, sort: mode })}
                      />
                    ))}
                  </ActionPanel.Submenu>
                </ActionPanel.Section>

                <ActionPanel.Section title="Manage">
                  <Action.Push
                    title="Add Service"
                    icon={Icon.Plus}
                    shortcut={Keyboard.Shortcut.Common.New}
                    target={
                      <AddServiceView enabledIds={config.enabledIds} onAdd={(id) => update(addService(config, id))} />
                    }
                  />
                  <Action
                    title="Move up"
                    icon={Icon.ArrowUp}
                    shortcut={Keyboard.Shortcut.Common.MoveUp}
                    onAction={() => update(moveService(config, state.service.id, -1))}
                  />
                  <Action
                    title="Move Down"
                    icon={Icon.ArrowDown}
                    shortcut={Keyboard.Shortcut.Common.MoveDown}
                    onAction={() => update(moveService(config, state.service.id, 1))}
                  />
                  <Action
                    title="Remove Service"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => update(removeService(config, state.service.id))}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section>
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={async () => {
                      await clearCache();
                      revalidate();
                    }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
