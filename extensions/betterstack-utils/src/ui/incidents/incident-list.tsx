import { getPreferenceValues, List } from "@raycast/api";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useIncidents } from "@/hooks/use-incidents";
import { IncidentListItem } from "@/ui/incidents/components/incident-list-item";
import { capitalize } from "@/common/utils/string-utils";

const queryClient = new QueryClient();

const IncidentFilter = {
  Active: "active",
  All: "all",
} as const;

type IncidentFilter = (typeof IncidentFilter)[keyof typeof IncidentFilter];

function Incidents() {
  const { teamId } = getPreferenceValues<Preferences>();
  const [filter, setFilter] = useState<IncidentFilter>(IncidentFilter.Active);
  const { incidents, isLoading, acknowledge, resolve, refresh } = useIncidents({
    activeOnly: filter === IncidentFilter.Active,
    teamId,
  });

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter incidents"
          value={filter}
          onChange={(newValue) => {
            if (newValue === IncidentFilter.Active || newValue === IncidentFilter.All) setFilter(newValue);
          }}
        >
          <List.Dropdown.Item title={capitalize(IncidentFilter.Active)} value={IncidentFilter.Active} />
          <List.Dropdown.Item title={capitalize(IncidentFilter.All)} value={IncidentFilter.All} />
        </List.Dropdown>
      }
    >
      {incidents.map((incident) => (
        <IncidentListItem
          key={incident.id}
          incident={incident}
          webUrl={incident.webUrl}
          onAcknowledge={acknowledge}
          onResolve={resolve}
          onRefresh={refresh}
        />
      ))}
    </List>
  );
}

export function IncidentList() {
  return (
    <QueryClientProvider client={queryClient}>
      <Incidents />
    </QueryClientProvider>
  );
}
