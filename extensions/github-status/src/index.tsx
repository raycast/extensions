import { Action, ActionPanel, Color, Detail } from "@raycast/api";
import fetch from "node-fetch";
import { useAsync } from "react-use";

interface Status {
  components: StatusComponent[];
  incidents: StatusIncident[];
  status: { indicator: string; description: string };
  scheduled_maintenances: StatusScheduledMaintenance[];
}

interface StatusIncident {
  id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
  shortlink: string;
  incident_updates: StatusIncidentUpdate[];
}

interface StatusIncidentUpdate {
  id: string;
  status: string;
  body: string;
  created_at: string;
  updated_at: string;
}

interface StatusScheduledMaintenance {
  id: string;
  name: string;
  components: StatusComponent[];
  shortlink: string;
  scheduled_for: string;
  scheduled_until: string;
}

interface StatusComponent {
  id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
  position: number;
  description: string;
  only_show_if_degraded: boolean;
}

const colorsMap: Record<string, string> = {
  operational: Color.Green,
  partial_outage: Color.Yellow,
  major_outage: Color.Red,
};

const printIncident = (incident: StatusIncident) => [
  `### ${incident.name}`,
  `_Posted at [${new Date(incident.created_at).toLocaleTimeString([], {
    hour: "numeric",
    minute: "numeric",
  })}](${incident.shortlink})_\n\nStatus: _${incident.status}_`,
  ...incident.incident_updates.map(
    (update) =>
      `- [${new Date(update.updated_at).toLocaleTimeString([], {
        hour: "numeric",
        minute: "numeric",
      })}] ${update.body}`
  ),
];

export default function Command() {
  const data = useAsync<() => Promise<Status>>(
    () =>
      fetch("https://www.githubstatus.com/api/v2/summary.json").then(async (res) => {
        return (await res.json()) as Status;
      }),
    []
  );

  return (
    <Detail
      isLoading={data.loading}
      navigationTitle="GitHub Status Summary"
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url="https://www.githubstatus.com" />
        </ActionPanel>
      }
      markdown={`## General Status\n\n${data.value?.status.description ?? "Loading..."}\n\n${
        data.value?.incidents.length
          ? ["## Incidents", ...data.value?.incidents.flatMap(printIncident)].join("\n\n")
          : ""
      }`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Components Status">
            {data.value?.components
              .filter((component) => component.name !== "Visit www.githubstatus.com for more information")
              .sort((a, b) => a.position - b.position)
              .map((component) => (
                <Detail.Metadata.TagList.Item
                  key={component.name}
                  text={component.name}
                  color={colorsMap[component.status]}
                />
              ))}
          </Detail.Metadata.TagList>
          {data.value?.scheduled_maintenances.flatMap((maintainence) => [
            <Detail.Metadata.Separator key={`${maintainence.id}-separator`} />,
            <Detail.Metadata.Link
              key={maintainence.id}
              title="Scheduled Maintainence"
              text={maintainence.name.replace(/^Scheduled Maintenance for /, "")}
              target={maintainence.shortlink}
            />,
            <Detail.Metadata.Label
              key={`${maintainence.id}-scheduled`}
              title="Scheduled for"
              text={`${new Date(maintainence.scheduled_for).toLocaleString([], {
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "numeric",
              })} to ${new Date(maintainence.scheduled_until).toLocaleString([], {
                hour: "numeric",
                minute: "numeric",
              })}`}
            />,
            maintainence.components.length ? (
              <Detail.Metadata.TagList key={`${maintainence.id}-components`} title="Affected Components">
                {maintainence.components.map((component) => (
                  <Detail.Metadata.TagList.Item
                    key={component.name}
                    text={component.name}
                    color={colorsMap[component.status]}
                  />
                ))}
              </Detail.Metadata.TagList>
            ) : null,
          ])}
        </Detail.Metadata>
      }
    />
  );
}
