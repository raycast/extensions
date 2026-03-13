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

  const keywords = [
    incident.message || "",
    incident.counterId || "",
    incident.status || "",
    incident?.groupedIncident?.priority || "",
    incident?.groupedIncident?.severity || "",
  ].filter(Boolean); // Remove empty strings

  return (
    <List.Item
      title={truncate(incident.message, truncateLimit) || "Parsing failed"}
      subtitle={incident.counterId}
      keywords={keywords}
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
  const {
    data: paginatedData,
    isLoading,
    error,
    mutate,
    pagination,
  } = useCachedPromise(
    () => async (options: { page: number }) => {
      const response = await api.incidents.getOpenIncidents(options.page + 1, 20);

      const combinedData = [
        ...response.NACK_Incidents.map((incident: Incident) => ({ ...incident, type: "NACK" as const })),
        ...response.ACK_Incidents.map((incident: Incident) => ({ ...incident, type: "ACK" as const })),
      ];

      return {
        data: combinedData,
        hasMore: response.pagination.total > (options.page + 1) * 20,
      };
    },
    [],
    {
      onError: (err) => {
        console.error("Error fetching incidents:", err);
      },
    },
  );

  const updateIncidentStatus = useCallback(
    async (incident: Incident, newStatus: "ACK" | "RES") => {
      await mutate(Promise.resolve(), {
        optimisticUpdate(currentData: Incident[] | undefined) {
          if (!currentData) return [];
          // Proceed with the rest of the function
          if (newStatus === "RES") {
            return currentData.filter((item) => item._id !== incident._id);
          }
          return currentData.map((item) => (item._id === incident._id ? { ...item, status: newStatus } : item));
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
      }
    },
    [updateIncidentStatus],
  );

  const resolveIncident = useCallback(
    async (incident: Incident) => {
      try {
        await api.incidents.resolveIncident(incident);
        await updateIncidentStatus(incident, "RES");
        await showToast({ style: Toast.Style.Success, title: "Incident resolved" });
      } catch (err) {
        await showToast({ style: Toast.Style.Failure, title: "Failed to resolve incident" });
      }
    },
    [updateIncidentStatus],
  );

  const incidents = useMemo(() => {
    if (!paginatedData) return { triggered: [], acknowledged: [] };
    return {
      triggered: paginatedData.filter((incident) => incident.status === "NACK"),
      acknowledged: paginatedData.filter((incident) => incident.status === "ACK"),
    };
  }, [paginatedData]);

  if (error) {
    return <List.EmptyView title="Error" description="Failed to fetch incidents. Please try again." />;
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Open Incidents (${paginatedData?.length ?? 0})`}
      searchBarPlaceholder="Search among open incidents..."
      pagination={pagination}
    >
      {incidents.triggered.length > 0 && (
        <List.Section title="Triggered" subtitle={`${incidents.triggered.length} items`}>
          {incidents.triggered.map((incident) => (
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
          {incidents.acknowledged.map((incident) => (
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
