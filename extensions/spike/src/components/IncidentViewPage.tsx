import { Action, ActionPanel, Color, Detail, Icon, showToast, Toast } from "@raycast/api";
import { useMemo } from "react";
import { useCachedPromise } from "@raycast/utils";
import api from "../api";
import moment from "moment-timezone";
import shortcut from "../config/shortcut";
import config from "../config";

interface Incident {
  _id: string;
  message: string;
  metadata: object;
  counterId: string;
  status: "NACK" | "ACK" | "RES";
  links: Array<{ [key: string]: string }>;
  resMetadata?: object;
  escalation: { _id: string; name: string };
  integration: { _id: string; customName: string };
  history?: string[];
  events?: string[];
  NACK_at: string;
  ACK_at?: string;
  RES_at?: string;
}

interface GroupedIncident {
  priority?: string;
  severity?: string;
}

interface ApiResponse {
  incident: Incident;
  groupedIncident: GroupedIncident;
}

const statusTagProps: Record<Incident["status"], { text: string; color: Color }> = {
  NACK: { text: "Triggered", color: Color.Red },
  ACK: { text: "Acknowledged", color: Color.Blue },
  RES: { text: "Resolved", color: Color.Green },
};

const severities = [
  { value: "sev1", title: "SEV1" },
  { value: "sev2", title: "SEV2" },
  { value: "sev3", title: "SEV3" },
];

const priorities = [
  { value: "p1", title: "P1" },
  { value: "p2", title: "P2" },
  { value: "p3", title: "P3" },
  { value: "p4", title: "P4" },
  { value: "p5", title: "P5" },
];

const getIcon = (path: string): string => `https://cdn.spike.sh/icons/${path}`;

const linksToMarkdown = (links: Array<{ [key: string]: string }>): string =>
  links
    .map((linkObj) => {
      const [label, url] = Object.entries(linkObj)[0];
      return `- [${label}](${url})`;
    })
    .join("\n");

export default function Main({ counterId }: { counterId: string }) {
  const fetchIncident = async (id: string): Promise<ApiResponse> => {
    try {
      return await api.incidents.getIncident(id);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("An unknown error occurred");
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch incident",
        message: error.message,
      });
      throw error;
    }
  };

  const { data, isLoading, mutate, revalidate } = useCachedPromise<typeof fetchIncident, [string]>(
    fetchIncident,
    [counterId],
    {
      keepPreviousData: true,
    },
  );

  const handleStatusUpdate = async (action: () => Promise<void>, newStatus: "ACK" | "RES", successMessage: string) => {
    try {
      await action();
      await mutate(Promise.resolve(), {
        optimisticUpdate(currentData: ApiResponse | [string]) {
          if (!currentData) return currentData;
          return {
            ...currentData,
            incident: {
              ...(currentData as ApiResponse).incident,
              status: newStatus,
              [`${newStatus}_at`]: new Date().toISOString(),
            },
          };
        },
      });
      await showToast({ style: Toast.Style.Success, title: successMessage });
    } catch (err) {
      console.error(`Error updating incident status:`, err);
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to ${newStatus.toLowerCase()} incident`,
      });
      revalidate();
    }
  };

  const handleMetadataUpdate = async (
    action: () => Promise<void>,
    updateFn: (current: GroupedIncident) => GroupedIncident,
  ) => {
    try {
      await action();
      await mutate(Promise.resolve(), {
        optimisticUpdate(currentData: ApiResponse | [string]) {
          if (!currentData) return currentData;
          return {
            ...currentData,
            groupedIncident: updateFn((currentData as ApiResponse).groupedIncident),
          };
        },
      });
    } catch (err) {
      console.error("Error updating incident metadata:", err);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update incident",
      });
      revalidate();
    }
  };

  const acknowledgeIncident = async () => {
    if (!data) return;
    await handleStatusUpdate(() => api.incidents.acknowledgeIncident(data.incident), "ACK", "Incident acknowledged");
  };

  const resolveIncident = async () => {
    if (!data) return;
    await handleStatusUpdate(() => api.incidents.resolveIncident(data.incident), "RES", "Incident resolved");
  };

  const setSeverity = async (severity: string) => {
    if (!data) return;
    await handleMetadataUpdate(
      () => api.incidents.setSeverity([data.incident.counterId], severity),
      (current) => ({ ...current, severity }),
    );
  };

  const removeSeverity = async () => {
    if (!data) return;
    await handleMetadataUpdate(
      () => api.incidents.removeSeverity([data.incident.counterId]),
      (current) => ({ ...current, severity: undefined }),
    );
  };

  const setPriority = async (priority: string) => {
    if (!data) return;
    await handleMetadataUpdate(
      () => api.incidents.setPriority([data.incident.counterId], priority),
      (current) => ({ ...current, priority }),
    );
  };

  const removePriority = async () => {
    if (!data) return;
    await handleMetadataUpdate(
      () => api.incidents.removePriority([data.incident.counterId]),
      (current) => ({ ...current, priority: undefined }),
    );
  };

  const markdown = useMemo(() => {
    if (!data) return "Loading...";
    const { incident } = data;
    return `
# ${incident.message}

${incident.links.length > 0 ? `### Links\n${linksToMarkdown(incident.links)}` : ""}

### Triggered incident details
\`\`\`json
${JSON.stringify(incident.metadata, null, 2)}
\`\`\`

${
  incident.resMetadata && incident.status === "RES"
    ? `
### Resolve incident details
\`\`\`json
${JSON.stringify(incident.resMetadata, null, 2)}
\`\`\`
`
    : ""
}
    `.trim();
  }, [data]);

  const metadata = useMemo(() => {
    if (!data) return null;
    const { incident, groupedIncident } = data;

    return (
      <Detail.Metadata>
        <Detail.Metadata.TagList title="Status">
          <Detail.Metadata.TagList.Item {...statusTagProps[incident.status]} />
        </Detail.Metadata.TagList>

        {groupedIncident?.priority && (
          <Detail.Metadata.Label
            icon={{ source: getIcon(`${groupedIncident.priority}.png`) }}
            title="Priority"
            text={groupedIncident.priority.toUpperCase()}
          />
        )}
        {groupedIncident?.severity && (
          <Detail.Metadata.Label
            title="Severity"
            text={groupedIncident.severity.toUpperCase()}
            icon={{ source: getIcon(`${groupedIncident.severity}.png`) }}
          />
        )}

        <Detail.Metadata.Link
          title="Escalation"
          target={`${config?.spike}/escalations/${incident.escalation._id}`}
          text={incident.escalation.name}
        />
        <Detail.Metadata.Link
          title="Integration"
          target={`${config?.spike}/integrations/${incident.integration._id}`}
          text={incident.integration.customName}
        />

        <Detail.Metadata.Separator />
        {incident.history && incident.history.length > 0 && (
          <Detail.Metadata.Label
            title="Repeated"
            text={`${incident.history.length} ${incident.history.length === 1 ? "time" : "times"}`}
          />
        )}

        {incident.events && incident.events.length > 0 && (
          <Detail.Metadata.Label
            title="Suppressed"
            text={`${incident.events.length} ${incident.events.length === 1 ? "time" : "times"}`}
          />
        )}

        <Detail.Metadata.Label title="Triggered at" text={moment(incident.NACK_at).format("MMM DD, YYYY h:mm A")} />
        {incident.status !== "NACK" && incident.ACK_at && (
          <Detail.Metadata.Label title="Acknowledged At" text={moment(incident.ACK_at).format("MMM DD, YYYY h:mm A")} />
        )}
        {incident.status === "RES" && incident.RES_at && (
          <Detail.Metadata.Label title="Resolved At" text={moment(incident.RES_at).format("MMM DD, YYYY h:mm A")} />
        )}
      </Detail.Metadata>
    );
  }, [data]);

  const actions = useMemo(() => {
    if (!data) return null;

    return (
      <ActionPanel>
        <Action.OpenInBrowser title="Open in Spike" url={`${config?.spike}/incidents/${data.incident.counterId}`} />
        {data.incident.status === "NACK" && (
          <Action
            shortcut={shortcut.ACKNOWLEDGE_INCIDENT}
            title="Acknowledge"
            icon={Icon.Circle}
            onAction={acknowledgeIncident}
          />
        )}
        {data.incident.status !== "RES" && (
          <Action
            shortcut={shortcut.RESOLVE_INCIDENT}
            title="Resolve"
            icon={Icon.Checkmark}
            onAction={resolveIncident}
          />
        )}
        <ActionPanel.Submenu icon={{ source: getIcon("sev2.png") }} title="Change Severity">
          {severities.map((severity) => (
            <Action
              icon={{ source: getIcon(`${severity.value}.png`) }}
              key={severity.value}
              title={severity.title}
              onAction={() => setSeverity(severity.value)}
            />
          ))}
          <Action icon={Icon.XmarkCircle} key="remove-severity" title="Remove Severity" onAction={removeSeverity} />
        </ActionPanel.Submenu>
        <ActionPanel.Submenu icon={{ source: getIcon("p2.png") }} title="Change Priority">
          {priorities.map((priority) => (
            <Action
              icon={{ source: getIcon(`${priority.value}.png`) }}
              key={priority.value}
              title={priority.title}
              onAction={() => setPriority(priority.value)}
            />
          ))}
          <Action icon={Icon.XmarkCircle} key="remove-priority" title="Remove Priority" onAction={removePriority} />
        </ActionPanel.Submenu>
      </ActionPanel>
    );
  }, [data]);

  return (
    <Detail
      markdown={markdown}
      navigationTitle={data ? data.incident.counterId : "Loading..."}
      isLoading={isLoading}
      metadata={metadata}
      actions={actions}
    />
  );
}
