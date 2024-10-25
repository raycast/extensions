import { ActionPanel, List, Action, Icon, Color, showToast, Toast } from "@raycast/api";
import { useMemo, useCallback } from "react";
import { useCachedPromise } from "@raycast/utils";
import api from "./api";
import React from "react";
import IncidentDetailsView from "./components/IncidentViewPage";
import shortcuts from "./config/shortcut";
import config from "./config";

interface Incident {
  _id: string;
  message: string;
  metadata: object;
  counterId: string;
  counter: string;
  status: "NACK" | "ACK" | "RES";
  groupedIncident: {
    priority?: string;
    severity?: string;
  };
}

interface Pagination {
  currentPage: number;
  total: number;
}

interface IncidentResponse {
  NACK_Incidents: Incident[];
  ACK_Incidents: Incident[];
  pagination: Pagination;
}

const tagProps: Record<Incident["status"], { value: string; color: Color }> = {
  NACK: { value: "Triggered", color: Color.Red },
  ACK: { value: "Acknowledged", color: Color.Blue },
  RES: { value: "Resolved", color: Color.PrimaryText },
};

const getIcon = (path: string): string => `https://cdn.spike.sh/icons/${path}`;
const truncate = (str: string, n: number) => (str && str.length > n ? str.substring(0, n - 1) + "..." : str);

const IncidentListItem = React.memo(function IncidentListItem({
  incident,
  onAcknowledge,
  onResolve,
}: {
  incident: Incident;
  onAcknowledge: (incident: Incident) => Promise<void>;
  onResolve: (incident: Incident) => Promise<void>;
}) {
  const accessories = [];
  if (incident?.groupedIncident?.priority) {
    accessories.push({
      icon: { source: getIcon(`${incident.groupedIncident.priority}.png`) },
      tooltip: incident.groupedIncident.priority.toUpperCase(),
      text: incident.groupedIncident.priority.toUpperCase(),
    });
  }

  if (incident?.groupedIncident?.severity) {
    accessories.push({
      icon: { source: getIcon(`${incident.groupedIncident.severity}.png`) },
      tooltip: incident.groupedIncident.severity.toUpperCase(),
      text: incident.groupedIncident.severity.toUpperCase(),
    });
  }

  const truncateLimit = accessories.length > 1 ? 40 : 50;

  return (
    <List.Item
      title={truncate(incident.message, truncateLimit) || "Parsing failed"}
      subtitle={incident.counterId}
      keywords={[incident.message, incident.counterId, incident.status]}
      accessories={[...accessories, { tag: tagProps[incident.status] }]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Details"
            icon={Icon.Info}
            target={<IncidentDetailsView counterId={incident.counterId} />}
          />
          <Action.OpenInBrowser
            title="Open Incident in Spike"
            icon={Icon.Globe}
            url={`${config!.spike}/incidents/${incident?.counterId}`}
          />
          <Action
            shortcut={shortcuts.ACKNOWLEDGE_INCIDENT}
            title="Acknowledge"
            icon={Icon.Circle}
            onAction={() => onAcknowledge(incident)}
          />
          <Action
            shortcut={shortcuts.RESOLVE_INCIDENT}
            title="Resolve"
            icon={Icon.Checkmark}
            onAction={() => onResolve(incident)}
          />
        </ActionPanel>
      }
    />
  );
});

export default function Command() {
  const { data, isLoading, error, mutate, revalidate } = useCachedPromise(
    (page: number = 0) => api.incidents.getOpenIncidents(page),
    [0],
    {
      onError: (err) => {
        console.error("Error fetching incidents:", err);
      },
    },
  );

  const updateIncidentStatus = useCallback(
    async (incident: Incident, newStatus: "ACK" | "RES") => {
      await mutate(Promise.resolve(), {
        optimisticUpdate(currentData: IncidentResponse | undefined) {
          if (!currentData) return currentData;

          const updateIncident = (incidents: Incident[]) =>
            incidents.map((i) => (i._id === incident._id ? { ...i, status: newStatus } : i));

          return {
            ...currentData,
            NACK_Incidents: updateIncident(currentData.NACK_Incidents),
            ACK_Incidents: updateIncident(currentData.ACK_Incidents),
          };
        },
      });
    },
    [mutate],
  );

  const acknowledgeIncident = useCallback(
    async (incident: Incident) => {
      try {
        await api.incidents.acknowledgeIncident(incident);
        await updateIncidentStatus(incident, "ACK");
        await showToast({ style: Toast.Style.Success, title: "Incident acknowledged" });
      } catch (err) {
        await showToast({ style: Toast.Style.Failure, title: "Failed to acknowledge incident" });
        revalidate();
      }
    },
    [updateIncidentStatus, revalidate],
  );

  const resolveIncident = useCallback(
    async (incident: Incident) => {
      try {
        await api.incidents.resolveIncident(incident);
        await updateIncidentStatus(incident, "RES");
        await showToast({ style: Toast.Style.Success, title: "Incident resolved" });
      } catch (err) {
        await showToast({ style: Toast.Style.Failure, title: "Failed to resolve incident" });
        revalidate();
      }
    },
    [updateIncidentStatus, revalidate],
  );

  const incidents = useMemo(() => {
    if (!data) return { triggered: [], acknowledged: [] };
    return {
      triggered: data.NACK_Incidents,
      acknowledged: data.ACK_Incidents,
    };
  }, [data]);

  if (error) {
    return <List.EmptyView title="Error" description="Failed to fetch incidents. Please try again." />;
  }

  const incidentPagination = {
    pageSize: 20,
    hasMore: data?.pagination && data.pagination.total > incidents.triggered.length + incidents.acknowledged.length,
    onLoadMore: async () => {
      const nextPage = (data?.pagination?.currentPage ?? 0) + 1;
      await mutate(api.incidents.getOpenIncidents(nextPage));
    },
  };

  return (
    <List
      pagination={incidentPagination}
      isLoading={isLoading}
      navigationTitle={`Open Incidents (${data?.pagination?.total ?? 0})`}
      searchBarPlaceholder="Search among open incidents..."
    >
      {incidents.triggered.length > 0 && (
        <List.Section title="Triggered" subtitle={`${incidents.triggered.length} items`}>
          {incidents.triggered.map((incident: Incident) => (
            <IncidentListItem
              key={incident._id}
              incident={incident}
              onAcknowledge={acknowledgeIncident}
              onResolve={resolveIncident}
            />
          ))}
        </List.Section>
      )}
      {incidents.acknowledged.length > 0 && (
        <List.Section title="Acknowledged" subtitle={`${incidents.acknowledged.length} items`}>
          {incidents.acknowledged.map((incident: Incident) => (
            <IncidentListItem
              key={incident._id}
              incident={incident}
              onAcknowledge={acknowledgeIncident}
              onResolve={resolveIncident}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
