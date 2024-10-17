import { ActionPanel, List, Action, Icon, Color, showToast, Toast } from "@raycast/api";
import { useEffect, useState, useMemo, useCallback } from "react";
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

  let truncateLimit = 50;

  if (accessories.length > 1) {
    // means we have both priority and severity
    truncateLimit = 40;
  }

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
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchIncidents = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.incidents.getOpenIncidents();
      setPagination(response.pagination);
      setIncidents([...response.NACK_Incidents, ...response.ACK_Incidents]);
    } catch (err) {
      console.error("Error fetching incidents:", err);
      setError("Failed to fetch incidents. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const updateIncidentStatus = useCallback((incident: Incident, newStatus: "ACK" | "RES") => {
    setIncidents((prevIncidents) =>
      prevIncidents.map((i) => (i._id === incident._id ? { ...i, status: newStatus } : i)),
    );
  }, []);

  const acknowledgeIncident = useCallback(
    async (incident: Incident) => {
      try {
        await api.incidents.acknowledgeIncident(incident);
        updateIncidentStatus(incident, "ACK");
        await showToast({ style: Toast.Style.Success, title: "Incident acknowledged" });
      } catch (err) {
        console.error("Error acknowledging incident:", err);
        await showToast({ style: Toast.Style.Failure, title: "Failed to acknowledge incident" });
      }
    },
    [updateIncidentStatus],
  );

  const resolveIncident = useCallback(
    async (incident: Incident) => {
      try {
        await api.incidents.resolveIncident(incident);
        updateIncidentStatus(incident, "RES");
        await showToast({ style: Toast.Style.Success, title: "Incident resolved" });
      } catch (err) {
        console.error("Error resolving incident:", err);
        await showToast({ style: Toast.Style.Failure, title: "Failed to resolve incident" });
      }
    },
    [updateIncidentStatus],
  );

  const triggeredIncidents = useMemo(() => incidents.filter((i) => i.status === "NACK"), [incidents]);
  const acknowledgedIncidents = useMemo(() => incidents.filter((i) => i.status === "ACK"), [incidents]);

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (error) {
    return <List.EmptyView title="Error" description={error} />;
  }

  const incidentPagination = {
    pageSize: 20,
    hasMore: pagination && pagination.total > incidents.length ? true : false,
    onLoadMore: async () => {
      const response = await api.incidents.getOpenIncidents((pagination?.currentPage ?? 0) + 1);
      setPagination(response.pagination);
      setIncidents([...incidents, ...response.NACK_Incidents, ...response.ACK_Incidents]);
    },
  };

  return (
    <List
      pagination={incidentPagination}
      isLoading={isLoading}
      navigationTitle={`Open Incidents (${pagination?.total})`}
      searchBarPlaceholder="Search among open incidents..."
    >
      {triggeredIncidents.length > 0 && (
        <List.Section title="Triggered" subtitle={`${triggeredIncidents.length} items`}>
          {triggeredIncidents.map((incident) => (
            <IncidentListItem
              key={incident._id}
              incident={incident}
              onAcknowledge={acknowledgeIncident}
              onResolve={resolveIncident}
            />
          ))}
        </List.Section>
      )}
      {acknowledgedIncidents.length > 0 && (
        <List.Section title="Acknowledged" subtitle={`${acknowledgedIncidents.length} items`}>
          {acknowledgedIncidents.map((incident) => (
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
