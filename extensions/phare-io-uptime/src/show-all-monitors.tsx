import { List, getPreferenceValues, Icon } from "@raycast/api";
import { Preferences } from "./types";
import { useMonitors } from "./hooks/useMonitors";
import { groupMonitorsByStatus } from "./utils/monitorUtils";
import { MonitorItem } from "./components/MonitorItem";
import { ErrorView } from "./components/ErrorView";

export default function Command() {
  const { phareApiKey } = getPreferenceValues<Preferences>();
  const { monitors, isLoading, error } = useMonitors(phareApiKey);

  if (error) {
    return <ErrorView error={error} />;
  }

  const groupedMonitors = groupMonitorsByStatus(monitors);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search monitors..."
      navigationTitle="Phare Monitors"
      isShowingDetail
    >
      {monitors.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No active monitors found"
          icon={Icon.EyeDisabled}
          description="Create your first monitor to start tracking your services"
        />
      ) : null}
      {Object.entries(groupedMonitors).map(([section, items]) =>
        items.length > 0 ? (
          <List.Section key={section} title={section}>
            {items.map((monitor) => (
              <MonitorItem
                key={`${monitor.id}-${monitor.status}`}
                monitor={monitor}
                apiKey={phareApiKey}
              />
            ))}
          </List.Section>
        ) : null,
      )}
    </List>
  );
}
