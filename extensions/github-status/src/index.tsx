import { Action, ActionPanel, Color, Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Status, STATUS_URL, StatusIncident } from "@/api";

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
      })}] ${update.body}`,
  ),
];

export default function Command() {
  const { isLoading, data, error } = useFetch<Status>(STATUS_URL);

  if (error) {
    return (
      <Detail
        markdown={`## Error loading GitHub status\n\n${error.message}`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open GitHub Status in Browser" url="https://www.githubstatus.com" />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="GitHub Status Summary"
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url="https://www.githubstatus.com" />
        </ActionPanel>
      }
      markdown={`## General Status\n\n${data?.status.description ?? "Loading..."}\n\n${
        data?.incidents.length ? ["## Incidents", ...data.incidents.flatMap(printIncident)].join("\n\n") : ""
      }`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Components Status">
            {data?.components
              .filter((component) => component.name !== "Visit www.githubstatus.com for more information")
              .toSorted((a, b) => a.position - b.position)
              .map((component) => (
                <Detail.Metadata.TagList.Item
                  key={component.name}
                  text={component.name}
                  color={colorsMap[component.status]}
                />
              ))}
          </Detail.Metadata.TagList>
          {data?.scheduled_maintenances.flatMap((maintenance) => [
            <Detail.Metadata.Separator key={`${maintenance.id}-separator`} />,
            <Detail.Metadata.Link
              key={maintenance.id}
              title="Scheduled Maintenance"
              text={maintenance.name.replace(/^Scheduled Maintenance for /, "")}
              target={maintenance.shortlink}
            />,
            <Detail.Metadata.Label
              key={`${maintenance.id}-scheduled`}
              title="Scheduled for"
              text={`${new Date(maintenance.scheduled_for).toLocaleString([], {
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "numeric",
              })} to ${new Date(maintenance.scheduled_until).toLocaleString([], {
                hour: "numeric",
                minute: "numeric",
              })}`}
            />,
            maintenance.components.length ? (
              <Detail.Metadata.TagList key={`${maintenance.id}-components`} title="Affected Components">
                {maintenance.components.map((component) => (
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
